import { auth } from '@/auth';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const [apiKeySetting] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.tenantId, await getTenantId()), eq(settings.key, 'panda_api_key'))).limit(1);
  const apiKey = apiKeySetting?.value;
  if (!apiKey) {
    return NextResponse.json({ error: 'Panda API Key não configurada. Vá em Configurações → Players.' }, { status: 400 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get('search') ?? '';
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const perPage = 24;

  try {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      ...(search ? { title: search } : {}),
    });

    const res = await fetch(`https://api-v2.pandavideo.com.br/videos?${params}`, {
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[panda-videos] API error:', res.status, text);
      return NextResponse.json({ error: `Erro na API do Panda Video: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    // Panda Video API returns { data: [...], total: number, page: number, per_page: number }
    const videos = (data.data ?? data.videos ?? []).map((v: {
      id: string;
      title: string;
      duration?: number;
      status?: string;
      thumbnail?: string;
      cover_url?: string;
      created_at?: string;
    }) => ({
      id: v.id,
      title: v.title,
      duration: v.duration ?? 0,
      status: v.status ?? 'ready',
      thumbnail: v.thumbnail ?? v.cover_url ?? null,
      createdAt: v.created_at ?? null,
    }));

    return NextResponse.json({
      videos,
      total: data.total ?? videos.length,
      page,
      perPage,
      totalPages: Math.ceil((data.total ?? videos.length) / perPage),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[panda-videos] Fetch error:', msg);
    return NextResponse.json({ error: `Erro de conexão com Panda Video: ${msg}` }, { status: 500 });
  }
}
