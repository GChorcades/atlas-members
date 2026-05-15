import { auth } from '@/auth';
import { db } from '@/db';
import { courses, modules, lessons } from '@/db/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;
  const tenantId = await getTenantId();

  const [course] = await db.select().from(courses).where(and(eq(courses.tenantId, tenantId), eq(courses.id, id))).limit(1);
  if (!course) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  const courseModules = await db.select().from(modules).where(and(eq(modules.tenantId, tenantId), eq(modules.courseId, id))).orderBy(asc(modules.position));

  const allLessons = courseModules.length > 0
    ? await db.select().from(lessons).where(and(eq(lessons.tenantId, tenantId), inArray(lessons.moduleId, courseModules.map((m) => m.id)))).orderBy(asc(lessons.position))
    : [];

  const modulesWithLessons = courseModules.map((m) => ({
    id: m.id,
    title: m.title,
    duration: m.duration,
    position: m.position,
    lessons: allLessons
      .filter((l) => l.moduleId === m.id)
      .map((l) => ({
        id: l.id,
        title: l.title,
        type: l.type,
        duration: l.duration,
        position: l.position,
        published: l.published,
        hasVideo: !!(l.bunnyVideoId || l.pandaVideoId),
        hasTranscript: !!l.transcript,
        hasSummary: !!l.aiSummary,
      })),
  }));

  return NextResponse.json({
    course,
    modules: modulesWithLessons,
  });
}
