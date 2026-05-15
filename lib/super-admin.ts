import crypto from 'crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { platformAdmins } from '@/db/schema';

/**
 * Sessão do Super Admin — independente do NextAuth (que é por tenant).
 * Um cookie httpOnly assinado com HMAC identifica o administrador da plataforma.
 */

export const SUPER_ADMIN_COOKIE = 'sa_session';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET não configurado');
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function createSuperAdminToken(adminId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${adminId}.${expires}`;
  return Buffer.from(`${payload}.${sign(payload)}`).toString('base64url');
}

export function verifySuperAdminToken(token: string): { adminId: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 3) return null;
    const [adminId, expiresStr, sig] = parts;
    const expected = sign(`${adminId}.${expiresStr}`);
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const expires = parseInt(expiresStr, 10);
    if (!expires || Date.now() > expires) return null;
    return { adminId };
  } catch {
    return null;
  }
}

export type SuperAdmin = { id: string; name: string; email: string };

/** Retorna o super admin autenticado da requisição atual, ou `null`. */
export const getSuperAdmin = cache(async (): Promise<SuperAdmin | null> => {
  const token = (await cookies()).get(SUPER_ADMIN_COOKIE)?.value;
  if (!token) return null;
  const parsed = verifySuperAdminToken(token);
  if (!parsed) return null;
  const [row] = await db
    .select({ id: platformAdmins.id, name: platformAdmins.name, email: platformAdmins.email })
    .from(platformAdmins)
    .where(eq(platformAdmins.id, parsed.adminId))
    .limit(1);
  return row ?? null;
});

/** Garante super admin autenticado — redireciona ao login caso contrário. */
export async function requireSuperAdmin(): Promise<SuperAdmin> {
  const admin = await getSuperAdmin();
  if (!admin) redirect('/super-admin/login');
  return admin;
}
