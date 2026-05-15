import OpenAI from 'openai';
import { auth } from '@/auth';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 });
  }

  const { messages, lessonTitle, transcript, courseTitle } = await req.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    lessonTitle: string;
    transcript?: string;
    courseTitle: string;
  };

  const systemPrompt = `Você é um assistente de estudos especializado no conteúdo do curso "${courseTitle}", especificamente na aula "${lessonTitle}".

Seu papel:
- Responder dúvidas sobre o conteúdo desta aula
- Explicar conceitos de forma simples e didática
- Dar exemplos práticos quando útil
- Ser direto e objetivo, mas amigável
${transcript ? `\nTranscrição da aula para referência:\n${transcript.slice(0, 4000)}` : ''}

Responda sempre em português do Brasil. Se a pergunta não for sobre o conteúdo do curso, redirecione gentilmente o aluno.`;

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
