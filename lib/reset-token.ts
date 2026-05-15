import crypto from 'crypto';

const TTL_MS = 60 * 60 * 1000; // 1 hora

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET não configurado');
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createResetToken(userId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${userId}.${expires}`;
  const sig = sign(payload);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function verifyResetToken(token: string): { userId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;
    const [userId, expiresStr, sig] = parts;
    const expected = sign(`${userId}.${expiresStr}`);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const expires = parseInt(expiresStr, 10);
    if (!expires || Date.now() > expires) return null;
    return { userId };
  } catch {
    return null;
  }
}
