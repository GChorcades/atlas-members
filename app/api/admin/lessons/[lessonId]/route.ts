import { auth } from '@/auth';
import { db } from '@/db';
import { lessons, modules, courses, settings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';

export async function GET(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { lessonId } = await params;
  const tenantId = await getTenantId();
  const [lesson] = await db.select().from(lessons).where(and(eq(lessons.tenantId, tenantId), eq(lessons.id, lessonId))).limit(1);
  if (!lesson) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

  const [mod] = await db.select().from(modules).where(and(eq(modules.tenantId, tenantId), eq(modules.id, lesson.moduleId))).limit(1);
  const [course] = mod
    ? await db.select({ title: courses.title }).from(courses).where(and(eq(courses.tenantId, tenantId), eq(courses.id, mod.courseId))).limit(1)
    : [null];

  const [pandaPlayer] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.tenantId, tenantId), eq(settings.key, 'panda_player_id'))).limit(1);
  const [pandaKey] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.tenantId, tenantId), eq(settings.key, 'panda_api_key'))).limit(1);
  const pandaConfigured = !!(pandaPlayer?.value && pandaKey?.value);
  const bunnyConfigured = !!process.env.BUNNY_LIBRARY_ID || !!process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;

  return NextResponse.json({
    ...lesson,
    module: mod ? { id: mod.id, title: mod.title, courseId: mod.courseId } : null,
    courseTitle: course?.title ?? '',
    pandaPlayerId: pandaPlayer?.value ?? null,
    pandaConfigured,
    bunnyConfigured,
  });
}
