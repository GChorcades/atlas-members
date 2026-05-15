import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyResetToken } from '@/lib/reset-token';
import { getTenantId } from '@/lib/tenant';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!token) {
    return NextResponse.json({ error: 'Token ausente' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
  }

  const decoded = verifyResetToken(token);
  if (!decoded) {
    return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 400 });
  }

  const tenantId = await getTenantId();
  const [user] = await db.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.id, decoded.userId))).limit(1);
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await db.update(users)
    .set({ passwordHash: hash, updatedAt: new Date() })
    .where(and(eq(users.tenantId, tenantId), eq(users.id, user.id)));

  return NextResponse.json({ ok: true });
}
