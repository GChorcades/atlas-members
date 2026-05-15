import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notifyWelcome } from '@/lib/notifications';

export async function POST(req: Request) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios.' }, { status: 400 });
  }
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 255) {
    return NextResponse.json({ error: 'Nome inválido.' }, { status: 400 });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
  }
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
  }
  const hash = await bcrypt.hash(password, 12);
  await db.insert(users).values({ id: nanoid(), name, email, passwordHash: hash });

  try {
    await notifyWelcome({ name, email });
  } catch (err) {
    console.error('[register] notify falhou', err);
  }

  return NextResponse.json({ ok: true });
}
