import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'assetflow_super_secret_key_2026';

function base64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// Signs a payload with HMAC-SHA256 JWT
export function signToken(payload, expiresIn = 86400) {
  const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const fullPayload = JSON.stringify({ ...payload, exp });
  
  const encodedHeader = base64url(header);
  const encodedPayload = base64url(fullPayload);
  
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Verifies a HMAC-SHA256 JWT token
export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [encodedHeader, encodedPayload, signature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
    
  if (signature !== expectedSignature) {
    return null;
  }
  
  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload));
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Token has expired
    }
    return payload;
  } catch (err) {
    return null;
  }
}
