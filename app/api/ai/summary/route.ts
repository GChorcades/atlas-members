import OpenAI from 'openai';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { lessons, modules, enrollments } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { lessonId, transcript: clientTranscript, title: clientTitle } = await req.json() as {
    lessonId: string;
    transcript?: string;
    title?: string;
  };

  if (!lessonId) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }

  const tenantId = await getTenantId();
  const [lesson] = await db
    .select({ id: lessons.id, title: lessons.title, transcript: lessons.transcript, moduleId: lessons.moduleId })
    .from(lessons)
    .where(and(eq(lessons.tenantId, tenantId), eq(lessons.id, lessonId)))
    .limit(1);

  if (!lesson) return NextResponse.json({ error: 'Aula não encontrada' }, { status: 404 });

  if (session.user.role !== 'admin') {
    const [mod] = await db.select({ courseId: modules.courseId }).from(modules).where(and(eq(modules.tenantId, tenantId), eq(modules.id, lesson.moduleId))).limit(1);
    if (!mod) return NextResponse.json({ error: 'Sem acesso' }, { status: 403 });
    const [enrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.userId, session.user.id), eq(enrollments.courseId, mod.courseId)))
      .limit(1);
    if (!enrollment) return NextResponse.json({ error: 'Sem acesso a esta aula' }, { status: 403 });
  }

  // Admins may supply an unsaved transcript; students always use the DB value
  const isAdmin = session.user.role === 'admin';
  const transcript = isAdmin ? (clientTranscript ?? lesson.transcript ?? '') : (lesson.transcript ?? '');
  const title = clientTitle ?? lesson.title;

  if (!transcript && !title) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }

  const prompt = transcript
    ? `Crie um resumo estruturado e didático em português para esta aula de um curso online.\n\nTítulo da aula: "${title}"\n\nTranscrição:\n${transcript.slice(0, 8000)}\n\nO resumo deve ter:\n- Um parágrafo introdutório do que foi abordado\n- Os principais pontos em tópicos claros\n- Uma conclusão com o aprendizado central\n\nEscreva de forma clara e objetiva, como se fosse um mentor explicando para um aluno.`
    : `Crie um resumo estruturado e didático em português para uma aula chamada "${title}".\n\nO resumo deve ter:\n- Um parágrafo introdutório do que provavelmente foi abordado\n- Os principais conceitos esperados em tópicos claros\n- Uma conclusão com o aprendizado central\n\nEscreva de forma clara e objetiva.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Você é um especialista em educação online que cria resumos didáticos e objetivos de aulas para plataformas de cursos.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1000,
    temperature: 0.6,
  });

  const summary = completion.choices[0]?.message?.content ?? '';

  if (isAdmin) {
    await db.update(lessons).set({ aiSummary: summary }).where(and(eq(lessons.tenantId, tenantId), eq(lessons.id, lessonId)));
  }

  return NextResponse.json({ summary });
}
