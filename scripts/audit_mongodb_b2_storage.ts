import fs from 'fs';
import path from 'path';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

// 1. Load environment variables safely
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        process.env[key] = val;
      }
    }
  }
}

interface B2ObjectInfo {
  key: string;
  size: number;
  etag?: string;
  lastModified?: Date;
  normalizedKey: string;
  normalizedBasename: string;
}

interface MongoCaseStudyRecord {
  id: string;
  title: string;
  slug: string;
  status: 'published' | 'draft' | string;
  pdf_file_name: string | null;
  pdf_storage_key: string | null;
}

interface AuditResultRow {
  index: number;
  title: string;
  mongoKey: string | null;
  exactExistsInB2: boolean;
  matchType: 'MATCHED' | 'STALE STORAGE KEY' | 'POSSIBLE MATCH' | 'MISSING' | 'NO MATCH';
  matchedB2Key: string | null;
  status: string;
  fileSizeMb?: string;
  details: string;
}

function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/^case-studies\//i, '')
    .replace(/^[0-9]+-[a-f0-9]+-/i, '') // strip timestamp-uuid prefix
    .replace(/[^a-z0-9]/g, '');
}

async function runStorageAudit() {
  console.log('==================================================');
  console.log('=== READ-ONLY STORAGE AUDIT: MONGODB vs B2 BUCKET ===');
  console.log('==================================================\n');

  // 1. Load MongoDB Records
  const recordsPath = path.join(process.cwd(), 'scripts', 'all_61_published_records.json');
  if (!fs.existsSync(recordsPath)) {
    throw new Error(`Records file not found: ${recordsPath}`);
  }
  const mongoRecords: MongoCaseStudyRecord[] = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
  console.log(`[MongoDB Inventory] Loaded ${mongoRecords.length} MongoDB Case Study Records.\n`);

  // 2. Connect to Backblaze B2 S3 API
  const endpoint = process.env.B2_ENDPOINT!.trim().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
  const keyId = process.env.B2_KEY_ID!;
  const applicationKey = process.env.B2_APPLICATION_KEY!;
  const bucketName = process.env.B2_BUCKET_NAME || 'Case-Studies';

  const s3Client = new S3Client({
    endpoint: cleanEndpoint,
    region: 'us-east-005',
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: applicationKey,
    },
    forcePathStyle: true,
  });

  console.log(`[Backblaze B2] Querying live bucket "${bucketName}" via ListObjectsV2Command...`);
  const listCmd = new ListObjectsV2Command({ Bucket: bucketName });
  const listRes = await s3Client.send(listCmd);
  const b2Items = listRes.Contents || [];
  console.log(`[Backblaze B2] Total Objects in Bucket: ${b2Items.length}\n`);

  const b2Objects: B2ObjectInfo[] = b2Items.map((item) => {
    const key = item.Key || '';
    const basename = key.split('/').pop() || key;
    return {
      key,
      size: item.Size || 0,
      etag: item.ETag,
      lastModified: item.LastModified,
      normalizedKey: normalizeString(key),
      normalizedBasename: normalizeString(basename),
    };
  });

  const referencedB2Keys = new Set<string>();
  const auditTable: AuditResultRow[] = [];

  for (let i = 0; i < mongoRecords.length; i++) {
    const doc = mongoRecords[i];
    const title = doc.title || 'Untitled';
    const docStatus = doc.status || 'published';
    const pdfFileName = doc.pdf_file_name || null;
    const storageKey = doc.pdf_storage_key || null;

    let exactMatch = false;
    let matchedKey: string | null = null;
    let matchType: 'MATCHED' | 'STALE STORAGE KEY' | 'POSSIBLE MATCH' | 'MISSING' | 'NO MATCH' = 'NO MATCH';
    let details = '';
    let fileSizeMb: string | undefined = undefined;

    if (storageKey) {
      // Direct HeadObject check against B2
      try {
        const headCmd = new HeadObjectCommand({ Bucket: bucketName, Key: storageKey });
        const headRes = await s3Client.send(headCmd);
        exactMatch = true;
        matchedKey = storageKey;
        matchType = 'MATCHED';
        referencedB2Keys.add(storageKey);
        fileSizeMb = headRes.ContentLength ? (headRes.ContentLength / 1024 / 1024).toFixed(2) + ' MB' : undefined;
        details = 'Exact object verified in B2 via HeadObject (200 OK)';
      } catch (err) {
        exactMatch = false;
      }
    }

    if (!exactMatch) {
      if (!storageKey) {
        matchType = 'MISSING';
        details = 'No pdf_storage_key set in MongoDB record';
      } else {
        const normStorageKey = normalizeString(storageKey);
        const normFileName = normalizeString(pdfFileName || '');
        const normTitle = normalizeString(title);

        // Find candidate matching B2 objects
        const candidate = b2Objects.find((b2Obj) => {
          return (
            (normStorageKey && normStorageKey.length > 3 && b2Obj.normalizedBasename === normStorageKey) ||
            (normFileName && normFileName.length > 3 && b2Obj.normalizedBasename === normFileName) ||
            (normTitle && normTitle.length > 6 && b2Obj.normalizedBasename.includes(normTitle)) ||
            (normTitle && normTitle.length > 6 && normTitle.includes(b2Obj.normalizedBasename))
          );
        });

        if (candidate) {
          matchedKey = candidate.key;
          referencedB2Keys.add(candidate.key);
          fileSizeMb = (candidate.size / 1024 / 1024).toFixed(2) + ' MB';

          if (candidate.key.endsWith(storageKey) || candidate.normalizedBasename === normStorageKey) {
            matchType = 'STALE STORAGE KEY';
            details = `MongoDB key "${storageKey}" is stale. Canonical key in B2: "${candidate.key}"`;
          } else {
            matchType = 'POSSIBLE MATCH';
            details = `Filename match in B2: "${candidate.key}"`;
          }
        } else {
          matchType = 'NO MATCH';
          details = `Key "${storageKey}" missing in B2 bucket (404 Not Found)`;
        }
      }
    }

    auditTable.push({
      index: i + 1,
      title,
      mongoKey: storageKey,
      exactExistsInB2: exactMatch,
      matchType,
      matchedB2Key: matchedKey,
      status: docStatus,
      fileSizeMb,
      details,
    });
  }

  // Unreferenced B2 PDFs
  const unreferencedB2Objects = b2Objects.filter((b) => !referencedB2Keys.has(b.key));

  const summary = {
    totalMongoCaseStudies: mongoRecords.length,
    publishedCount: mongoRecords.filter((r) => r.status === 'published').length,
    draftCount: mongoRecords.filter((r) => r.status === 'draft').length,
    totalB2Pdfs: b2Objects.length,
    exactMatches: auditTable.filter((r) => r.matchType === 'MATCHED').length,
    staleStorageKeys: auditTable.filter((r) => r.matchType === 'STALE STORAGE KEY').length,
    missingPdfs: auditTable.filter((r) => r.matchType === 'MISSING').length,
    possibleMatches: auditTable.filter((r) => r.matchType === 'POSSIBLE MATCH').length,
    noMatchPdfs: auditTable.filter((r) => r.matchType === 'NO MATCH').length,
    unreferencedB2Pdfs: unreferencedB2Objects.length,
  };

  const outputPayload = {
    summary,
    auditTable,
    unreferencedB2Objects: unreferencedB2Objects.map((b) => ({
      key: b.key,
      sizeMb: (b.size / 1024 / 1024).toFixed(2) + ' MB',
      lastModified: b.lastModified,
    })),
  };

  const jsonOutPath = path.join(process.cwd(), 'scratch', 'final_storage_audit.json');
  fs.mkdirSync(path.dirname(jsonOutPath), { recursive: true });
  fs.writeFileSync(jsonOutPath, JSON.stringify(outputPayload, null, 2), 'utf8');

  console.log('=== STORAGE AUDIT SUMMARY ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nSaved detailed audit JSON to ${jsonOutPath}`);
}

runStorageAudit().catch(console.error);
