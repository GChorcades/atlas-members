import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  await db
    .update(users)
    .set({ termsAcceptedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.tenantId, await getTenantId()), eq(users.id, session.user.id)));

  return NextResponse.json({ ok: true });
}
