import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Informe a senha atual e a nova senha' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
  }

  const tenantId = await getTenantId();
  const [user] = await db.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.id, session.user.id))).limit(1);
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(and(eq(users.tenantId, tenantId), eq(users.id, session.user.id)));

  return NextResponse.json({ ok: true });
}
