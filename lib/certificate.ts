import { createHmac } from 'crypto';
import { db } from '@/db';
import { courses, modules, lessons, lessonProgress, users } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { getCourseStats } from '@/lib/course-stats';
import { getBrand } from '@/lib/brand';

/**
 * Funções puras de domínio do certificado de conclusão de curso.
 * Toda consulta é escopada por `tenant_id`.
 */

export type CourseCompletion = {
  complete: boolean;
  completedAt: Date | null;
};

export type CertificateData = {
  studentName: string;
  courseTitle: string;
  instructor: string;
  completedAtLabel: string;
  durationLabel: string;
  brandName: string;
  brandLogoUrl: string | null;
  brandColor: string | null;
  code: string;
};

/** Alfabeto base32 sem caracteres ambíguos (sem 0/O, 1/I/L). */
const BASE32_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Converte um texto em slug seguro para nome de arquivo (ex.: título do curso). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'curso';
}

/**
 * Verifica se um curso está 100% concluído por um aluno.
 * Concluído = todas as aulas publicadas dos módulos do curso têm registro
 * em `lesson_progress` com `done = true` para o `userId`.
 * Curso sem aulas publicadas nunca conta como concluído.
 */
export async function isCourseComplete(
  tenantId: string,
  userId: string,
  courseId: string,
): Promise<CourseCompletion> {
  const courseModules = await db
    .select({ id: modules.id })
    .from(modules)
    .where(and(eq(modules.tenantId, tenantId), eq(modules.courseId, courseId)));

  const moduleIds = courseModules.map((m) => m.id);
  if (moduleIds.length === 0) return { complete: false, completedAt: null };

  const publishedLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(
      and(
        eq(lessons.tenantId, tenantId),
        inArray(lessons.moduleId, moduleIds),
        eq(lessons.published, true),
      ),
    );

  if (publishedLessons.length === 0) return { complete: false, completedAt: null };

  const lessonIds = publishedLessons.map((l) => l.id);

  const progressRows = await db
    .select({ lessonId: lessonProgress.lessonId, completedAt: lessonProgress.completedAt })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.tenantId, tenantId),
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.done, true),
        inArray(lessonProgress.lessonId, lessonIds),
      ),
    );

  const doneSet = new Set(progressRows.map((p) => p.lessonId));
  const complete = lessonIds.every((id) => doneSet.has(id));
  if (!complete) return { complete: false, completedAt: null };

  let completedAt: Date | null = null;
  for (const row of progressRows) {
    if (row.completedAt && (!completedAt || row.completedAt > completedAt)) {
      completedAt = row.completedAt;
    }
  }

  return { complete: true, completedAt };
}

/**
 * Código de autenticação determinístico do certificado.
 * `PREFIXO-XXXXX` — prefixo de 3 letras da marca + 5 chars base32 do HMAC.
 * O mesmo aluno/curso gera sempre o mesmo código.
 */
export function certificateCode(
  tenantId: string,
  userId: string,
  courseId: string,
  brandName: string,
): string {
  const secret = process.env.AUTH_SECRET ?? '';
  const digest = createHmac('sha256', secret)
    .update(`${tenantId}:${userId}:${courseId}`)
    .digest();

  // Converte os primeiros bytes em base32 (5 bits por caractere).
  let bits = 0;
  let value = 0;
  let body = '';
  for (let i = 0; i < digest.length && body.length < 5; i++) {
    value = (value << 8) | digest[i];
    bits += 8;
    while (bits >= 5 && body.length < 5) {
      bits -= 5;
      body += BASE32_ALPHABET[(value >>> bits) & 0x1f];
    }
  }

  const letters = (brandName || '').toUpperCase().replace(/[^A-Z]/g, '');
  const prefix = (letters + 'XXX').slice(0, 3);

  return `${prefix}-${body}`;
}

/**
 * Maior `completedAt` entre as aulas publicadas concluídas pelo aluno.
 * Usado na emissão forçada (admin), quando o curso ainda não está 100%.
 */
async function latestLessonCompletion(
  tenantId: string,
  userId: string,
  courseId: string,
): Promise<Date | null> {
  const courseModules = await db
    .select({ id: modules.id })
    .from(modules)
    .where(and(eq(modules.tenantId, tenantId), eq(modules.courseId, courseId)));

  const moduleIds = courseModules.map((m) => m.id);
  if (moduleIds.length === 0) return null;

  const publishedLessons = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(
      and(
        eq(lessons.tenantId, tenantId),
        inArray(lessons.moduleId, moduleIds),
        eq(lessons.published, true),
      ),
    );
  if (publishedLessons.length === 0) return null;

  const progressRows = await db
    .select({ completedAt: lessonProgress.completedAt })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.tenantId, tenantId),
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.done, true),
        inArray(lessonProgress.lessonId, publishedLessons.map((l) => l.id)),
      ),
    );

  let latest: Date | null = null;
  for (const row of progressRows) {
    if (row.completedAt && (!latest || row.completedAt > latest)) {
      latest = row.completedAt;
    }
  }
  return latest;
}

/**
 * Reúne todos os dados necessários para renderizar o PNG do certificado.
 *
 * Retorna `null` se o curso não estiver concluído pelo aluno — exceto quando
 * `options.allowIncomplete` é `true` (emissão forçada pelo admin): nesse caso
 * só retorna `null` se o curso ou o aluno não existir, e a data de conclusão
 * usa o maior `completedAt` disponível ou `new Date()` se não houver nenhum.
 */
export async function getCertificateData(
  tenantId: string,
  userId: string,
  courseId: string,
  options?: { allowIncomplete?: boolean },
): Promise<CertificateData | null> {
  const allowIncomplete = options?.allowIncomplete === true;

  const [course] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.tenantId, tenantId), eq(courses.id, courseId)))
    .limit(1);
  if (!course) return null;

  let completedAt: Date | null;
  if (allowIncomplete) {
    completedAt = await latestLessonCompletion(tenantId, userId, courseId);
  } else {
    const completion = await isCourseComplete(tenantId, userId, courseId);
    if (!completion.complete) return null;
    completedAt = completion.completedAt;
  }

  const [student] = await db
    .select({ name: users.name })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))
    .limit(1);
  if (!student) return null;

  const statsMap = await getCourseStats([courseId]);
  const durationLabel = statsMap.get(courseId)?.durationLabel ?? '—';

  const brand = await getBrand();

  const completedAtLabel = (completedAt ?? new Date()).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return {
    studentName: student.name,
    courseTitle: course.title,
    instructor: course.instructor,
    completedAtLabel,
    durationLabel,
    brandName: brand.name,
    brandLogoUrl: brand.logoUrl,
    brandColor: brand.color,
    code: certificateCode(tenantId, userId, courseId, brand.name),
  };
}
