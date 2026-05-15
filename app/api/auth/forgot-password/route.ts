import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createResetToken } from '@/lib/reset-token';
import { notifyForgotPassword } from '@/lib/notifications';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Always return 200 to avoid email enumeration.
  if (user) {
    const token = createResetToken(user.id);
    const appUrl = process.env.NEXTAUTH_URL ?? 'https://claude-members.vercel.app';
    const link = `${appUrl}/reset-password/${token}`;
    try {
      await notifyForgotPassword(
        { name: user.name, email: user.email, phone: user.phone },
        link,
      );
    } catch (err) {
      console.error('[forgot-password] notify falhou', err);
    }
  }

  return NextResponse.json({ ok: true });
}
