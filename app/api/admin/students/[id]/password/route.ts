import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { notifyPasswordReset } from '@/lib/notifications';
import { getTenantId } from '@/lib/tenant';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
  }

  const tenantId = await getTenantId();
  const [user] = await db.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.id, id))).limit(1);
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(and(eq(users.tenantId, tenantId), eq(users.id, id)));

  try {
    await notifyPasswordReset(
      { name: user.name, email: user.email, phone: user.phone },
      newPassword,
    );
  } catch (err) {
    console.error('[admin password reset] notify falhou', err);
  }

  return NextResponse.json({ ok: true });
}
