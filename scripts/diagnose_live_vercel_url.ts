import crypto from 'crypto';

async function diagnoseLiveVercelUrl() {
  console.log('==================================================');
  console.log('=== LIVE VERCEL PRODUCTION URL DIAGNOSTIC ===');
  console.log('==================================================\n');

  const liveApiUrl = 'https://cis-case-study.vercel.app/api/pdf/download?key=case-studies%2F1786455092351-e2b55db7-ai-assisted_design_validation___autonomous_testing_workflows.pdf';

  console.log('[1/3] Fetching presigned URL from Live Vercel Production API...');
  const apiRes = await fetch(liveApiUrl);
  const apiJson = await apiRes.json();

  console.log(`- API_STATUS=${apiRes.status}`);
  console.log(`- API_SUCCESS=${apiJson.success}`);
  console.log(`- IS_B2_CONFIGURED=${apiJson.isB2Configured}`);

  if (!apiJson.url) {
    console.error('❌ No URL returned from production API.');
    return;
  }

  const parsedUrl = new URL(apiJson.url);
  const amzAlgorithm = parsedUrl.searchParams.get('X-Amz-Algorithm');
  const amzCredential = parsedUrl.searchParams.get('X-Amz-Credential') || '';
  const amzSignature = parsedUrl.searchParams.get('X-Amz-Signature');
  const amzExpires = parsedUrl.searchParams.get('X-Amz-Expires');

  const accessKeyIdInCred = amzCredential.split('/')[0] || '';
  const accessKeySha256 = crypto.createHash('sha256').update(accessKeyIdInCred).digest('hex');

  console.log('\n[2/3] Parsing Live Vercel Signed URL (Safe):');
  console.log(`- SIGNED_URL_HOST=${parsedUrl.hostname}`);
  console.log(`- SIGNED_URL_PATH=${parsedUrl.pathname}`);
  console.log(`- SIGNED_URL_ALGORITHM=${amzAlgorithm}`);
  console.log(`- SIGNED_URL_EXPIRES=${amzExpires}`);
  console.log(`- SIGNED_URL_CREDENTIAL_LENGTH=${accessKeyIdInCred.length}`);
  console.log(`- SIGNED_URL_CREDENTIAL_SHA256=${accessKeySha256}`);
  console.log(`- SIGNED_URL_SIGNATURE_PRESENT=${Boolean(amzSignature)}`);

  console.log('\n[3/3] Performing HTTP GET against Live Vercel Signed URL...');
  try {
    const b2Res = await fetch(apiJson.url, { method: 'GET' });
    console.log(`- PRODUCTION_GENERATED_URL_FETCH_STATUS=${b2Res.status}`);
    console.log(`- PRODUCTION_SIGNED_URL_ITSELF_WORKS=${b2Res.status === 200}`);

    if (b2Res.status !== 200) {
      const errText = await b2Res.text();
      console.log('Live B2 Error Response Body:', errText);
    } else {
      console.log('✓ Live Vercel signed URL returned HTTP 200 OK!');
    }
  } catch (err: any) {
    console.error('❌ Fetch error:', err.message);
  }
}

diagnoseLiveVercelUrl().catch(console.error);
