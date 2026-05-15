import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seed() {
  console.log('🌱 Seeding database…');

  // ─── Users ────────────────────────────────────────────────────────────────

  const adminHash = await bcrypt.hash('admin123', 12);
  const studentHash = await bcrypt.hash('aluno123', 12);

  const adminId = nanoid();
  const student1Id = nanoid();
  const student2Id = nanoid();

  await db.insert(schema.users).values([
    {
      id: adminId,
      name: 'Admin Atlas',
      email: 'admin@atlas.com',
      passwordHash: adminHash,
      role: 'admin',
      plan: 'lifetime',
      level: 10,
      xp: 9800,
      streak: 30,
    },
    {
      id: student1Id,
      name: 'Marina Almeida',
      email: 'marina@exemplo.com',
      passwordHash: studentHash,
      role: 'student',
      plan: 'monthly',
      level: 7,
      xp: 4280,
      streak: 12,
      location: 'São Paulo, BR',
    },
    {
      id: student2Id,
      name: 'Lucas Pereira',
      email: 'lucas@exemplo.com',
      passwordHash: studentHash,
      role: 'student',
      plan: 'annual',
      level: 3,
      xp: 1200,
      streak: 4,
    },
  ]).onConflictDoNothing();

  console.log('✅ Users created');

  // ─── Courses ──────────────────────────────────────────────────────────────

  const course1Id = nanoid();
  const course2Id = nanoid();
  const course3Id = nanoid();

  await db.insert(schema.courses).values([
    {
      id: course1Id,
      title: 'Marketing Digital Estratégico',
      subtitle: 'Do diagnóstico ao plano que escala',
      description: 'Um framework prático para construir uma operação de marketing que cresce de forma previsível. Sem fórmulas mágicas — método, mensuração e disciplina.',
      instructor: 'Rafael Cardoso',
      instructorRole: 'Ex-CMO • 14 anos no mercado',
      level: 'Intermediário',
      duration: '14h 12min',
      lessonCount: 32,
      moduleCount: 6,
      rating: 4.9,
      students: 1280,
      coverBg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #4338ca 100%)',
      coverGlyph: 'MD',
      coverAccent: '#a5b4fc',
      published: true,
    },
    {
      id: course2Id,
      title: 'Copywriting que Converte',
      subtitle: 'Escrita persuasiva sem clichês',
      description: 'A arte e a engenharia de escrever textos que vendem. Frameworks claros, exemplos reais e exercícios para você aplicar imediatamente.',
      instructor: 'Bianca Sato',
      instructorRole: 'Copywriter sênior • +200 lançamentos',
      level: 'Iniciante',
      duration: '8h 30min',
      lessonCount: 24,
      moduleCount: 5,
      rating: 4.8,
      students: 940,
      coverBg: 'linear-gradient(135deg, #134e4a 0%, #115e59 55%, #0f766e 100%)',
      coverGlyph: 'CC',
      coverAccent: '#5eead4',
      published: true,
    },
    {
      id: course3Id,
      title: 'Tráfego Pago do Zero',
      subtitle: 'Meta e Google sem desperdiçar verba',
      description: 'Da estrutura de conta ao escalonamento. Foco em decisões: o que medir, quando pausar, quando dobrar a aposta.',
      instructor: 'Diego Vasconcelos',
      instructorRole: 'Gestor de mídia • R$ 40M/ano investidos',
      level: 'Intermediário',
      duration: '11h 04min',
      lessonCount: 28,
      moduleCount: 6,
      rating: 4.9,
      students: 760,
      coverBg: 'linear-gradient(135deg, #3f1d1d 0%, #581c1c 55%, #7c2d2d 100%)',
      coverGlyph: 'TP',
      coverAccent: '#fda4af',
      published: true,
    },
  ]).onConflictDoNothing();

  // Tags
  await db.insert(schema.courseTags).values([
    { courseId: course1Id, tag: 'Estratégia' },
    { courseId: course1Id, tag: 'Funil' },
    { courseId: course1Id, tag: 'Posicionamento' },
    { courseId: course2Id, tag: 'Copy' },
    { courseId: course2Id, tag: 'Vendas' },
    { courseId: course2Id, tag: 'Texto' },
    { courseId: course3Id, tag: 'Meta Ads' },
    { courseId: course3Id, tag: 'Google Ads' },
    { courseId: course3Id, tag: 'Performance' },
  ]).onConflictDoNothing();

  console.log('✅ Courses created');

  // ─── Modules & Lessons for Course 1 ───────────────────────────────────────

  const mod1Id = nanoid(); const mod2Id = nanoid(); const mod3Id = nanoid();
  const mod4Id = nanoid(); const mod5Id = nanoid(); const mod6Id = nanoid();

  await db.insert(schema.modules).values([
    { id: mod1Id, courseId: course1Id, title: 'Fundamentos do marketing moderno', position: 0, duration: '1h 48min' },
    { id: mod2Id, courseId: course1Id, title: 'Posicionamento e proposta de valor', position: 1, duration: '2h 16min' },
    { id: mod3Id, courseId: course1Id, title: 'Funil de aquisição', position: 2, duration: '2h 42min' },
    { id: mod4Id, courseId: course1Id, title: 'Conteúdo que vende', position: 3, duration: '2h 30min' },
    { id: mod5Id, courseId: course1Id, title: 'Métricas que importam', position: 4, duration: '2h 04min' },
    { id: mod6Id, courseId: course1Id, title: 'Operação e cadência', position: 5, duration: '2h 52min' },
  ]).onConflictDoNothing();

  // Lessons for Module 1
  const m1lessons = [
    { title: 'Bem-vindo: como tirar o máximo deste curso', duration: '6:42' },
    { title: 'Por que a maioria das estratégias falha', duration: '18:30' },
    { title: 'O método em 4 camadas', duration: '22:14' },
    { title: 'Diagnóstico inicial: a planilha-mãe', duration: '31:08' },
    { title: 'Quiz: você entendeu o método?', duration: '5:00', type: 'quiz' as const },
  ];
  const m2lessons = [
    { title: 'O que é posicionamento (de verdade)', duration: '14:20' },
    { title: 'Mapeando concorrentes sem viés', duration: '28:11' },
    { title: 'Construindo sua tese de posicionamento', duration: '34:50' },
    { title: 'Estudo de caso: SaaS B2B nichado', duration: '22:03' },
    { title: 'Validando sua tese com clientes', duration: '37:42' },
  ];
  const m3lessons = [
    { title: 'Anatomia de um funil que funciona', duration: '19:48' },
    { title: 'Estruturando o topo do funil com conteúdo', duration: '24:00' },
    { title: 'Meio de funil: nutrição sem irritação', duration: '31:14' },
    { title: 'Fundo de funil e gatilhos de conversão', duration: '28:55' },
    { title: 'Quiz: mapeando seu funil', duration: '5:00', type: 'quiz' as const },
  ];

  const lesson1Ids: string[] = [];
  const lesson2Ids: string[] = [];
  const lesson3Ids: string[] = [];

  for (let i = 0; i < m1lessons.length; i++) {
    const id = nanoid();
    lesson1Ids.push(id);
    await db.insert(schema.lessons).values({ id, moduleId: mod1Id, title: m1lessons[i].title, duration: m1lessons[i].duration, type: (m1lessons[i] as any).type ?? 'video', position: i, published: true }).onConflictDoNothing();
  }
  for (let i = 0; i < m2lessons.length; i++) {
    const id = nanoid();
    lesson2Ids.push(id);
    await db.insert(schema.lessons).values({ id, moduleId: mod2Id, title: m2lessons[i].title, duration: m2lessons[i].duration, type: 'video', position: i, published: true }).onConflictDoNothing();
  }
  for (let i = 0; i < m3lessons.length; i++) {
    const id = nanoid();
    lesson3Ids.push(id);
    await db.insert(schema.lessons).values({ id, moduleId: mod3Id, title: m3lessons[i].title, duration: m3lessons[i].duration, type: (m3lessons[i] as any).type ?? 'video', position: i, published: true }).onConflictDoNothing();
  }

  // Other modules with a few placeholder lessons
  for (const [modId, title] of [[mod4Id, 'A pirâmide de conteúdo'], [mod5Id, 'CAC, LTV e a saúde do negócio'], [mod6Id, 'OKRs aplicados a marketing']] as [string, string][]) {
    const id = nanoid();
    await db.insert(schema.lessons).values({ id, moduleId: modId, title, duration: '22:00', type: 'video', position: 0, published: true }).onConflictDoNothing();
  }

  console.log('✅ Modules and lessons created');

  // ─── Enrollments & Progress ───────────────────────────────────────────────

  const e1Id = nanoid();
  await db.insert(schema.enrollments).values({
    id: e1Id,
    userId: student1Id,
    courseId: course1Id,
    progress: 0.42,
    lastLessonId: lesson3Ids[1] ?? lesson1Ids[0],
  }).onConflictDoNothing();

  // Mark first module lessons as done for student1
  for (const lessonId of lesson1Ids) {
    await db.insert(schema.lessonProgress).values({ userId: student1Id, lessonId, done: true, completedAt: new Date() }).onConflictDoNothing();
  }
  for (const lessonId of lesson2Ids) {
    await db.insert(schema.lessonProgress).values({ userId: student1Id, lessonId, done: true, completedAt: new Date() }).onConflictDoNothing();
  }
  if (lesson3Ids[0]) {
    await db.insert(schema.lessonProgress).values({ userId: student1Id, lessonId: lesson3Ids[0], done: true, completedAt: new Date() }).onConflictDoNothing();
  }

  // Enroll student1 in course 2
  await db.insert(schema.enrollments).values({
    id: nanoid(),
    userId: student1Id,
    courseId: course2Id,
    progress: 0.18,
    lastLessonId: null,
  }).onConflictDoNothing();

  // Enroll student2 in course 1
  await db.insert(schema.enrollments).values({
    id: nanoid(),
    userId: student2Id,
    courseId: course1Id,
    progress: 0.10,
    lastLessonId: lesson1Ids[1] ?? null,
  }).onConflictDoNothing();

  console.log('✅ Enrollments and progress created');

  // ─── Achievements ──────────────────────────────────────────────────────────

  const achIds: Record<string, string> = {};
  const achievs = [
    { key: 'a1', title: 'Primeiros passos', description: 'Concluiu a primeira aula', icon: 'spark', xpReward: 50 },
    { key: 'a2', title: 'Maratonista', description: '5 aulas em um dia', icon: 'flame', xpReward: 100 },
    { key: 'a3', title: 'Pensador crítico', description: 'Acertou 100% em um quiz', icon: 'brain', xpReward: 150 },
    { key: 'a4', title: 'Anotador', description: '20 notas criadas', icon: 'note', xpReward: 80 },
    { key: 'a5', title: 'Sequência de 7', description: '7 dias seguidos estudando', icon: 'streak', xpReward: 200 },
    { key: 'a6', title: 'Módulo completo', description: 'Concluiu 2 módulos', icon: 'check', xpReward: 250 },
    { key: 'a7', title: 'Curador', description: 'Comentou em 10 aulas', icon: 'chat', xpReward: 120 },
    { key: 'a8', title: 'Sequência de 30', description: '30 dias seguidos estudando', icon: 'streak', xpReward: 500 },
    { key: 'a9', title: 'Maestria', description: 'Concluiu um curso inteiro', icon: 'trophy', xpReward: 1000 },
    { key: 'a10', title: 'Certificado', description: 'Obteve seu primeiro certificado', icon: 'certificate', xpReward: 1000 },
  ];

  for (const a of achievs) {
    const id = nanoid();
    achIds[a.key] = id;
    await db.insert(schema.achievements).values({ id, title: a.title, description: a.description, icon: a.icon, xpReward: a.xpReward }).onConflictDoNothing();
  }

  // Give student1 some achievements
  const earnedKeys = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
  for (const key of earnedKeys) {
    await db.insert(schema.userAchievements).values({ userId: student1Id, achievementId: achIds[key], earnedAt: new Date() }).onConflictDoNothing();
  }

  console.log('✅ Achievements created');

  // ─── Trails ───────────────────────────────────────────────────────────────

  const trail1Id = nanoid();
  const trail2Id = nanoid();

  await db.insert(schema.trails).values([
    { id: trail1Id, title: 'Marketing do zero ao avançado', color: '#6366f1', position: 0 },
    { id: trail2Id, title: 'Especialização em aquisição paga', color: '#ef4444', position: 1 },
  ]).onConflictDoNothing();

  await db.insert(schema.trailCourses).values([
    { trailId: trail1Id, courseId: course1Id, position: 0 },
    { trailId: trail1Id, courseId: course2Id, position: 1 },
    { trailId: trail1Id, courseId: course3Id, position: 2 },
    { trailId: trail2Id, courseId: course3Id, position: 0 },
    { trailId: trail2Id, courseId: course1Id, position: 1 },
  ]).onConflictDoNothing();

  console.log('✅ Trails created');

  // ─── Comments ─────────────────────────────────────────────────────────────

  if (lesson3Ids[1]) {
    await db.insert(schema.comments).values([
      {
        id: nanoid(),
        lessonId: lesson3Ids[1],
        userId: student2Id,
        text: 'Esse insight de "topo de funil é tese, não tática" mudou meu raciocínio. Já refiz o planejamento aqui.',
        status: 'approved',
        likes: 14,
      },
      {
        id: nanoid(),
        lessonId: lesson3Ids[1],
        userId: student1Id,
        text: 'Alguém tem uma referência de empresa B2C que aplica bem o framework? Tenho exemplos B2B sobrando mas estou patinando no B2C.',
        status: 'pending',
        likes: 6,
      },
    ]).onConflictDoNothing();
  }

  console.log('✅ Comments created');
  console.log('');
  console.log('🎉 Seed concluído!');
  console.log('');
  console.log('Credenciais:');
  console.log('  Admin:   admin@atlas.com / admin123');
  console.log('  Aluno:   marina@exemplo.com / aluno123');
  console.log('  Aluno:   lucas@exemplo.com / aluno123');
}

seed().catch((e) => { console.error(e); process.exit(1); });
