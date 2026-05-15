import { auth } from '@/auth';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { getTenantId } from '@/lib/tenant';

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]);

function typeLabel(mime: string, name: string): string {
  if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return 'PDF';
  if (mime.includes('zip')) return 'ZIP';
  if (mime.includes('word') || /\.docx?$/i.test(name)) return 'DOC';
  if (mime.includes('excel') || /\.xlsx?$/i.test(name)) return 'XLS';
  if (mime.startsWith('image/')) return 'IMG';
  if (mime === 'text/plain') return 'TXT';
  return 'FILE';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  const { lessonId } = await params;
  const tenantId = await getTenantId();
  const rows = await db
    .select()
    .from(materials)
    .where(and(eq(materials.tenantId, tenantId), eq(materials.lessonId, lessonId)))
    .orderBy(asc(materials.createdAt));
  return NextResponse.json({ materials: rows });
}

export async function POST(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  const { lessonId } = await params;

  const form = await req.formData();
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  if (!ALLOWED.has(file.type) && file.type) {
    return NextResponse.json({ error: `Tipo não permitido: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo 25 MB.' }, { status: 400 });
  }

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blob = await put(`materials/${lessonId}/${Date.now()}-${safeName}`, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    });

    const id = nanoid();
    await db.insert(materials).values({
      id,
      tenantId: await getTenantId(),
      lessonId,
      name: file.name,
      url: blob.url,
      size: formatSize(file.size),
      type: typeLabel(file.type, file.name),
    });

    const [created] = await db.select().from(materials).where(eq(materials.id, id)).limit(1);
    return NextResponse.json({ material: created });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[materials upload]', msg);
    return NextResponse.json({ error: `Falha no upload: ${msg}` }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  const { lessonId } = await params;
  const url = new URL(req.url);
  const materialId = url.searchParams.get('id');
  if (!materialId) return NextResponse.json({ error: 'id ausente' }, { status: 400 });

  const tenantId = await getTenantId();
  const [row] = await db.select().from(materials).where(and(eq(materials.tenantId, tenantId), eq(materials.id, materialId))).limit(1);
  if (!row || row.lessonId !== lessonId) {
    return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 });
  }

  try {
    await del(row.url);
  } catch (err) {
    console.warn('[materials delete] falha ao remover blob', err);
  }
  await db.delete(materials).where(eq(materials.id, materialId));
  return NextResponse.json({ ok: true });
}
