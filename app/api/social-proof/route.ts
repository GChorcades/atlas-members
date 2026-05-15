import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type Person = { name: string; city: string; uf: string };

// Cache em memória — gera no máximo 1x por hora para limitar custo de API.
let cache: { people: Person[]; at: number } | null = null;
const TTL = 60 * 60 * 1000;

const FALLBACK: Person[] = [
  { name: 'Mariana Souza', city: 'São Paulo', uf: 'SP' },
  { name: 'Lucas Oliveira', city: 'Rio de Janeiro', uf: 'RJ' },
  { name: 'Beatriz Santos', city: 'Belo Horizonte', uf: 'MG' },
  { name: 'Gabriel Costa', city: 'Curitiba', uf: 'PR' },
  { name: 'Juliana Lima', city: 'Porto Alegre', uf: 'RS' },
  { name: 'Rafael Almeida', city: 'Salvador', uf: 'BA' },
  { name: 'Camila Ferreira', city: 'Recife', uf: 'PE' },
  { name: 'Thiago Rodrigues', city: 'Fortaleza', uf: 'CE' },
  { name: 'Larissa Martins', city: 'Brasília', uf: 'DF' },
  { name: 'Pedro Henrique', city: 'Goiânia', uf: 'GO' },
];

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) {
    return NextResponse.json({ people: cache.people });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você gera dados fictícios realistas de pessoas brasileiras para prova social de e-commerce.',
        },
        {
          role: 'user',
          content:
            'Gere 25 pessoas brasileiras fictícias. Cada uma com: nome completo brasileiro comum e realista, cidade brasileira real e a sigla do estado (UF) correspondente. Varie regiões do Brasil. Responda APENAS com JSON válido no formato: {"people":[{"name":"...","city":"...","uf":".."}]}',
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1200,
      temperature: 1,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    const people: Person[] = Array.isArray(parsed.people) ? parsed.people : [];
    const valid = people.filter(
      (p) => p && typeof p.name === 'string' && typeof p.city === 'string' && typeof p.uf === 'string',
    );

    if (valid.length >= 5) {
      cache = { people: valid, at: Date.now() };
      return NextResponse.json({ people: valid });
    }
  } catch (err) {
    console.error('[social-proof]', err);
  }

  return NextResponse.json({ people: FALLBACK });
}
