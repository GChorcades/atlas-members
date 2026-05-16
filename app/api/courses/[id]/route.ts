import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { courses, modules, lessons, courseTags, enrollments, lessonProgress } from '@/db/schema';
import { eq, and, asc, sql, inArray } from 'drizzle-orm';
import { parseDurationToSeconds, formatDurationFromSeconds } from '@/lib/course-stats';
import { getTenantId } from '@/lib/tenant';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const tenantId = await getTenantId();
  const [course] = await db.select().from(courses).where(and(eq(courses.tenantId, tenantId), eq(courses.id, id))).limit(1);
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const courseModules = await db.select().from(modules).where(and(eq(modules.tenantId, tenantId), eq(modules.courseId, id))).orderBy(asc(modules.position));
  const moduleIds = courseModules.map((m) => m.id);

  const isAdmin = session.user.role === 'admin';
  const allLessonsRaw = moduleIds.length > 0
    ? await db
        .select()
        .from(lessons)
        .where(
          isAdmin
            ? and(eq(lessons.tenantId, tenantId), inArray(lessons.moduleId, moduleIds))
            : and(eq(lessons.tenantId, tenantId), inArray(lessons.moduleId, moduleIds), eq(lessons.published, true))
        )
        .orderBy(asc(lessons.position))
    : [];

  const lessonsByModule = new Map<string, typeof allLessonsRaw>();
  for (const mod of courseModules) {
    lessonsByModule.set(mod.id, allLessonsRaw.filter((l) => l.moduleId === mod.id));
  }

  const tags = await db.select({ tag: courseTags.tag }).from(courseTags).where(and(eq(courseTags.tenantId, tenantId), eq(courseTags.courseId, id)));

  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.userId, session.user.id), eq(enrollments.courseId, id)))
    .limit(1);

  const flatLessonIds = courseModules.flatMap((m) => (lessonsByModule.get(m.id) ?? []).map((l) => l.id));

  const progressRows = flatLessonIds.length > 0
    ? await db.select().from(lessonProgress).where(and(eq(lessonProgress.tenantId, tenantId), eq(lessonProgress.userId, session.user.id)))
    : [];

  const doneSet = new Set(progressRows.filter((p) => p.done).map((p) => p.lessonId));
  const currentLessonId = enrollment?.lastLessonId;

  // Computed stats (overrides the mocked columns on the courses table)
  const allLessonsFlat = courseModules.flatMap((m) => lessonsByModule.get(m.id) ?? []);
  const lessonCount = allLessonsFlat.length;
  const moduleCount = courseModules.length;
  const totalSeconds = allLessonsFlat.reduce((sum, l) => sum + parseDurationToSeconds(l.duration), 0);
  const durationLabel = formatDurationFromSeconds(totalSeconds);
  const [studentRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.courseId, id)));
  const studentCount = Number(studentRow?.count ?? 0);

  // Certificado: curso concluído = todas as aulas publicadas têm progresso done.
  const publishedLessons = allLessonsFlat.filter((l) => l.published);
  const certificateAvailable =
    publishedLessons.length > 0 && publishedLessons.every((l) => doneSet.has(l.id));

  const result = {
    ...course,
    lessonCount,
    moduleCount,
    duration: durationLabel,
    students: studentCount,
    tags: tags.map((t) => t.tag),
    enrolled: !!enrollment,
    certificateAvailable,
    progress: enrollment?.progress ?? 0,
    lastLessonId: enrollment?.lastLessonId ?? null,
    modules: courseModules.map((mod) => ({
      ...mod,
      lessons: (lessonsByModule.get(mod.id) ?? []).map((l) => ({
        ...l,
        done: doneSet.has(l.id),
        current: l.id === currentLessonId,
      })),
    })),
  };

  return NextResponse.json(result);
}
