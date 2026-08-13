const JWT_SECRET = process.env.JWT_SECRET || 'default-fallback-secret-key-change-in-production-256bit';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  exp?: number;
}

function base64urlEncode(str: string | Uint8Array): string {
  const buf = typeof str === 'string' ? new TextEncoder().encode(str) : str;
  return Buffer.from(buf).toString('base64url');
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signAuthToken(payload: TokenPayload, expiresInSeconds: number = 604800): Promise<string> {
  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = base64urlEncode(JSON.stringify({ ...payload, exp }));

  const key = await getHmacKey(JWT_SECRET);
  const data = new TextEncoder().encode(`${header}.${fullPayload}`);
  const signature = await crypto.subtle.sign('HMAC', key, data);

  return `${header}.${fullPayload}.${base64urlEncode(new Uint8Array(signature))}`;
}

export async function verifyAuthToken(token: string): Promise<TokenPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const key = await getHmacKey(JWT_SECRET);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sigBytes = Buffer.from(sigB64, 'base64url');

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    if (!isValid) return null;

    const payload: TokenPayload = JSON.parse(base64urlDecode(payloadB64));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}
