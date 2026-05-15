import { auth } from '@/auth';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: `Tipo não permitido: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10 MB.' }, { status: 400 });
  }

  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const safeBase = (file.name.replace(/\.[^.]+$/, '') || 'image').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const blob = await put(`inline/${Date.now()}-${safeBase}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[upload-inline]', msg);
    return NextResponse.json({ error: `Falha no upload: ${msg}` }, { status: 500 });
  }
}
