import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import { nanoid } from 'nanoid';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Placeholder YouTube URLs — swap for real videos later.
const YT = [
  'https://www.youtube.com/watch?v=zjkBMFhNj_g',
  'https://www.youtube.com/watch?v=kCc8FmEb1nY',
  'https://www.youtube.com/watch?v=l8pRSuU81PU',
  'https://www.youtube.com/watch?v=7xTGNNLPyMI',
  'https://www.youtube.com/watch?v=VMj-3S1tku0',
  'https://www.youtube.com/watch?v=8rABwKRsec4',
];
const pickYT = (i: number) => YT[i % YT.length];

type ModuleSpec = {
  title: string;
  duration: string;
  lessons: Array<{ title: string; duration: string; type?: 'video' | 'quiz' }>;
};

const COURSE_TITLE = 'Vibe Coding 101 — Programando com IA';

const MODULES: ModuleSpec[] = [
  {
    title: 'Bem-vindo ao Vibe Coding',
    duration: '42min',
    lessons: [
      { title: 'O que é Vibe Coding (e por que mudou tudo)', duration: '12:18' },
      { title: 'Mindset: você descreve, a IA implementa', duration: '14:42' },
      { title: 'Ferramentas essenciais em 2026', duration: '15:30' },
    ],
  },
  {
    title: 'Setup do ambiente',
    duration: '1h 02min',
    lessons: [
      { title: 'Instalando o Claude Code', duration: '11:24' },
      { title: 'Cursor e VS Code com extensões de IA', duration: '18:10' },
      { title: 'Atalhos e fluxo diário', duration: '14:55' },
      { title: 'Quando usar agente vs autocomplete', duration: '17:48' },
    ],
  },
  {
    title: 'Prompts que funcionam',
    duration: '1h 28min',
    lessons: [
      { title: 'Anatomia de um bom prompt de código', duration: '16:22' },
      { title: 'Especificando intenção sem detalhes demais', duration: '19:05' },
      { title: 'Contexto: o que dar e o que omitir', duration: '21:30' },
      { title: 'Exemplos: do vago ao preciso', duration: '24:12' },
      { title: 'Quiz: avalie esses prompts', duration: '7:00', type: 'quiz' },
    ],
  },
  {
    title: 'Iterando com IA',
    duration: '1h 14min',
    lessons: [
      { title: 'Revisando o que a IA produz', duration: '17:48' },
      { title: 'Pedindo correções específicas', duration: '15:36' },
      { title: 'Refatoração assistida', duration: '22:14' },
      { title: 'Testes gerados por IA', duration: '18:50' },
    ],
  },
  {
    title: 'Debugging vibe',
    duration: '54min',
    lessons: [
      { title: 'Lendo stacktraces com IA', duration: '16:42' },
      { title: 'Quando a IA está enganada (e como perceber)', duration: '19:08' },
      { title: 'Hipóteses em paralelo: dividir pra conquistar', duration: '18:20' },
    ],
  },
  {
    title: 'Projetos práticos',
    duration: '2h 18min',
    lessons: [
      { title: 'CRUD completo em 1 hora', duration: '58:30' },
      { title: 'Integração com API externa em tempo real', duration: '42:15' },
      { title: 'Refatoração de codebase legada', duration: '37:48' },
    ],
  },
];

async function seed() {
  console.log('🌱 Seeding Vibe Coding course…');

  const existing = await db.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.title, COURSE_TITLE)).limit(1);
  if (existing.length) {
    console.log(`ℹ️  Course "${COURSE_TITLE}" already exists (id: ${existing[0].id}). Skipping.`);
    return;
  }

  const courseId = nanoid();

  await db.insert(schema.courses).values({
    id: courseId,
    title: COURSE_TITLE,
    subtitle: 'Do prompt ao deploy — desenvolvendo software no ritmo da IA',
    description:
      'Vibe coding é a prática de construir software descrevendo intenções em vez de digitar cada linha. Neste curso você aprende a tirar o máximo de ferramentas como Claude Code, Cursor e Copilot — desde os fundamentos de prompt até refatoração de codebases inteiras. Hands-on, com projetos reais.',
    instructor: 'Helena Vidal',
    instructorRole: 'Engenheira • +10 anos · Speaker em conferências de IA',
    level: 'Intermediário',
    duration: '7h 38min',
    lessonCount: MODULES.reduce((a, m) => a + m.lessons.length, 0),
    moduleCount: MODULES.length,
    rating: 4.9,
    students: 0,
    coverBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    coverGlyph: '⚡',
    coverAccent: '#38bdf8',
    published: true,
  });

  await db.insert(schema.courseTags).values([
    { courseId, tag: 'IA' },
    { courseId, tag: 'Claude Code' },
    { courseId, tag: 'Produtividade' },
    { courseId, tag: 'Prompts' },
    { courseId, tag: 'Cursor' },
  ]).onConflictDoNothing();

  let videoIndex = 0;
  for (let mi = 0; mi < MODULES.length; mi++) {
    const m = MODULES[mi];
    const moduleId = nanoid();
    await db.insert(schema.modules).values({
      id: moduleId,
      courseId,
      title: m.title,
      position: mi,
      duration: m.duration,
    });

    for (let li = 0; li < m.lessons.length; li++) {
      const lesson = m.lessons[li];
      const isVideo = lesson.type !== 'quiz';
      await db.insert(schema.lessons).values({
        id: nanoid(),
        moduleId,
        title: lesson.title,
        type: lesson.type ?? 'video',
        duration: lesson.duration,
        position: li,
        videoUrl: isVideo ? pickYT(videoIndex++) : null,
        published: true,
      });
    }
  }

  console.log(`✅ Course "${COURSE_TITLE}" created with ${MODULES.length} modules and ${MODULES.reduce((a, m) => a + m.lessons.length, 0)} lessons.`);
  console.log(`   Course id: ${courseId}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  });
