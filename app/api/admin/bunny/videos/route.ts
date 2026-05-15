import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export type BunnyVideo = {
  guid: string;
  title: string;
  length: number;        // seconds
  status: number;        // 4 = finished
  encodeProgress: number;
  storageSize: number;
  views: number;
  dateUploaded: string;
  thumbnailFileName: string;
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_API_KEY;

  if (!libraryId || !apiKey) {
    return NextResponse.json({ error: 'BunnyNet não configurado' }, { status: 500 });
  }

  const url = new URL(`https://video.bunnycdn.com/library/${libraryId}/videos`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('itemsPerPage', '50');
  url.searchParams.set('orderBy', 'date');
  if (search) url.searchParams.set('search', search);

  const res = await fetch(url.toString(), {
    headers: { AccessKey: apiKey },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Erro ao buscar vídeos da BunnyNet' }, { status: res.status });
  }

  const data = await res.json();
  const cdnHostname = process.env.BUNNY_CDN_HOSTNAME;

  const items: (BunnyVideo & { thumbnailUrl: string; durationFmt: string })[] = (data.items ?? []).map((v: BunnyVideo) => {
    const s = v.length;
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const durationFmt = hh > 0
      ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
      : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

    return {
      ...v,
      thumbnailUrl: cdnHostname && v.thumbnailFileName
        ? `https://${cdnHostname}/${v.guid}/${v.thumbnailFileName}`
        : '',
      durationFmt,
    };
  });

  return NextResponse.json({
    items,
    totalItems: data.totalItems ?? 0,
    currentPage: data.currentPage ?? 1,
    itemsPerPage: 50,
  });
}
