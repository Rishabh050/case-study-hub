import fs from 'fs';

// Parse .env.local manually
if (fs.existsSync('.env.local')) {
  const envText = fs.readFileSync('.env.local', 'utf8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
}

import { uploadFile, generateDownloadUrl } from '../lib/storage/backblaze';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

async function testB2StorageKey() {
  console.log('--- Testing B2 PutObject & HeadObject ---');
  const testBuffer = Buffer.from('Test PDF content for B2 key verification');
  const fileName = 'DevOps.pdf';

  // 1. Upload File
  const uploadRes = await uploadFile(testBuffer, fileName, 'application/pdf');
  console.log('Uploaded storageKey:', uploadRes.storageKey);

  const endpoint = process.env.B2_ENDPOINT!;
  const keyId = process.env.B2_KEY_ID!;
  const applicationKey = process.env.B2_APPLICATION_KEY!;
  const bucketName = process.env.B2_BUCKET_NAME!;

  const s3 = new S3Client({
    endpoint,
    region: 'us-east-005',
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: applicationKey,
    },
    forcePathStyle: true,
  });

  // 2. HeadObject on EXACT storageKey
  console.log('Testing HeadObject on EXACT key:', uploadRes.storageKey);
  try {
    const headRes = await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: uploadRes.storageKey }));
    console.log('HeadObject Success! ContentLength:', headRes.ContentLength);
  } catch (err: any) {
    console.error('HeadObject Failed:', err.message);
  }

  // 3. HeadObject on stripped key (to prove why NoSuchKey happened before)
  const strippedKey = uploadRes.storageKey.split('/').pop()!;
  console.log('Testing HeadObject on STRIPPED key:', strippedKey);
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: strippedKey }));
    console.log('Stripped Key HeadObject Success (Unexpected)');
  } catch (err: any) {
    console.log('Stripped Key HeadObject Failed as expected with:', err.name || err.message);
  }

  // 4. Generate Presigned Download URL
  const downloadUrl = await generateDownloadUrl(uploadRes.storageKey, 3600, fileName, true);
  console.log('Generated Download URL:', downloadUrl);
}

testB2StorageKey().catch(console.error);
