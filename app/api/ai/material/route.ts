import OpenAI from 'openai';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { lessonId, hint } = (await req.json()) as { lessonId: string; hint?: string };
  if (!lessonId) return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });

  const [lesson] = await db
    .select({ title: lessons.title, transcript: lessons.transcript, aiSummary: lessons.aiSummary })
    .from(lessons)
    .where(and(eq(lessons.tenantId, await getTenantId()), eq(lessons.id, lessonId)))
    .limit(1);
  if (!lesson) return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });

  const context = [
    `Título: "${lesson.title}"`,
    lesson.transcript ? `Transcrição (trecho):\n${lesson.transcript.slice(0, 6000)}` : '',
    lesson.aiSummary ? `Resumo:\n${lesson.aiSummary}` : '',
    hint ? `Direção solicitada pelo professor: ${hint}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const prompt = `Você é um especialista em educação que escreve material didático complementar para aulas online.\n\nCom base no contexto abaixo, escreva um material didático complementar à aula, em português, formatado em markdown.\n\nO material deve conter:\n- Um título em ## com o tema central\n- Um parágrafo introdutório explicando o objetivo do material\n- 2 a 4 seções (## subtítulos) com explicações aprofundadas dos conceitos\n- Use **negrito** para termos-chave, *itálico* para ênfase e \`código\` para identificadores técnicos quando aplicável\n- Inclua listas (- ou 1.) quando útil\n- Termine com uma seção "## Para fixar" com 3 a 5 perguntas reflexivas\n\nEscreva de forma clara, didática e direta. Não inclua disclaimers nem mencione que foi gerado por IA.\n\n${context}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Você é um redator pedagógico que produz material didático em markdown para cursos online.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2000,
    temperature: 0.7,
  });

  const content = completion.choices[0]?.message?.content ?? '';
  return NextResponse.json({ content });
}
