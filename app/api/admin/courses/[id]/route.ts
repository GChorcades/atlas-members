import { auth } from '@/auth';
import { db } from '@/db';
import { courses, modules, lessons } from '@/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;

  const [course] = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  if (!course) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  const courseModules = await db.select().from(modules).where(eq(modules.courseId, id)).orderBy(asc(modules.position));

  const allLessons = courseModules.length > 0
    ? await db.select().from(lessons).where(inArray(lessons.moduleId, courseModules.map((m) => m.id))).orderBy(asc(lessons.position))
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
