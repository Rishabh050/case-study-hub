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

import { uploadFile, generateDownloadUrl, checkObjectExists } from '../lib/storage/backblaze';

async function testE2EDownload() {
  console.log('==============================================');
  console.log('=== REAL B2 END-TO-END DOWNLOAD VERIFICATION ===');
  console.log('==============================================');

  const pdfPath = 'D:\\Downloads\\new-case-study\\DevOps.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error('Source test PDF file not found at:', pdfPath);
    return;
  }

  const fileBuffer = fs.readFileSync(pdfPath);
  const fileName = 'DevOps.pdf';

  // 1. Upload file to Backblaze B2
  console.log('\nStep 1: Uploading PDF to Backblaze B2...');
  const uploadResult = await uploadFile(fileBuffer, fileName, 'application/pdf');

  console.log('=== B2 UPLOAD DIAGNOSTIC ===', {
    bucket: process.env.B2_BUCKET_NAME,
    objectKey: uploadResult.storageKey,
    fileName: uploadResult.fileName,
    uploadSuccess: uploadResult.uploadSuccess,
  });

  if (!uploadResult.uploadSuccess) {
    console.error('FAILED: PutObject or HeadObject failed after upload.');
    return;
  }

  // 2. Verify HeadObject immediately after upload
  console.log('\nStep 2: Running HeadObject verification on stored key...');
  const headExists = await checkObjectExists(uploadResult.storageKey);
  console.log('=== DATABASE STORAGE KEY DIAGNOSTIC ===', {
    storedStorageKey: uploadResult.storageKey,
    headExists,
  });

  // 3. Generate presigned download URL with EXACT canonical storage key
  console.log('\nStep 3: Generating presigned download URL...');
  const presignedUrl = await generateDownloadUrl(uploadResult.storageKey, 3600, fileName, true);

  console.log('=== DOWNLOAD DIAGNOSTIC ===', {
    databaseStorageKey: uploadResult.storageKey,
    bucket: process.env.B2_BUCKET_NAME,
    exactObjectKey: uploadResult.storageKey,
    generatedUrl: presignedUrl,
  });

  if (!presignedUrl || !presignedUrl.startsWith('http')) {
    console.error('FAILED: Could not generate valid presigned download URL.');
    return;
  }

  // 4. Test actual HTTP GET request to Backblaze B2 presigned URL
  console.log('\nStep 4: Fetching actual PDF content from Backblaze B2 presigned URL...');
  const httpRes = await fetch(presignedUrl);
  console.log('HTTP Response Status:', httpRes.status, httpRes.statusText);
  console.log('Content-Type Header:', httpRes.headers.get('content-type'));
  console.log('Content-Length Header:', httpRes.headers.get('content-length'));

  if (httpRes.status === 200) {
    const downloadedBuffer = Buffer.from(await httpRes.arrayBuffer());
    console.log('Downloaded Buffer Size:', downloadedBuffer.length, 'bytes');
    console.log('Matching Buffer Size:', downloadedBuffer.length === fileBuffer.length ? 'YES (100% Match)' : 'NO');
    console.log('\nSUCCESS: REAL B2 PDF DOWNLOAD VERIFIED SUCCESSFULLY!');
  } else {
    const errorText = await httpRes.text();
    console.error('FAILED: B2 returned error response:\n', errorText);
  }
}

testE2EDownload().catch(console.error);
