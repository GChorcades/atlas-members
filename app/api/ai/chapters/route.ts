import OpenAI from 'openai';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons } from '@/db/schema';
import { eq } from 'drizzle-orm';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { lessonId } = (await req.json()) as { lessonId: string };
  if (!lessonId) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });

  const [lesson] = await db
    .select({ title: lessons.title, transcript: lessons.transcript })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);
  if (!lesson) return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });
  if (!lesson.transcript?.trim()) {
    return NextResponse.json({ error: 'Esta aula ainda não tem transcrição. Gere a transcrição primeiro.' }, { status: 400 });
  }

  const prompt = `Você recebe a transcrição de uma videoaula. Gere uma lista de capítulos (marcadores) do vídeo.\n\nTítulo da aula: "${lesson.title}"\n\nTranscrição:\n${lesson.transcript.slice(0, 12000)}\n\nRegras:\n- Entre 4 e 12 capítulos, distribuídos ao longo da aula.\n- Cada capítulo tem um tempo de início em segundos (número inteiro) e um título curto (3 a 7 palavras) em português.\n- O primeiro capítulo deve começar em 0.\n- Os tempos devem ser crescentes.\n- Estime os tempos pela posição do conteúdo na transcrição (a transcrição é sequencial).\n\nResponda APENAS com JSON válido no formato: {"chapters":[{"time":0,"title":"..."}]}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Você organiza videoaulas em capítulos navegáveis a partir da transcrição.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
    temperature: 0.4,
  });

  let chapters: { time: number; title: string }[] = [];
  try {
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    if (Array.isArray(parsed.chapters)) {
      chapters = parsed.chapters
        .filter((c: unknown): c is { time: number; title: string } =>
          !!c && typeof (c as { time?: unknown }).time === 'number' && typeof (c as { title?: unknown }).title === 'string')
        .map((c: { time: number; title: string }) => ({ time: Math.max(0, Math.round(c.time)), title: c.title.trim() }))
        .sort((a: { time: number }, b: { time: number }) => a.time - b.time);
    }
  } catch {
    return NextResponse.json({ error: 'A IA retornou um formato inválido. Tente novamente.' }, { status: 502 });
  }

  if (!chapters.length) {
    return NextResponse.json({ error: 'Não foi possível gerar capítulos.' }, { status: 502 });
  }

  await db.update(lessons).set({ chapters: JSON.stringify(chapters) }).where(eq(lessons.id, lessonId));
  return NextResponse.json({ chapters });
}
