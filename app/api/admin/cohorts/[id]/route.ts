import { auth } from '@/auth';
import { db } from '@/db';
import { cohorts, cohortCourses, cohortMembers, courses, users } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;
  const tenantId = await getTenantId();

  const [cohort] = await db.select().from(cohorts).where(and(eq(cohorts.tenantId, tenantId), eq(cohorts.id, id))).limit(1);
  if (!cohort) return NextResponse.json({ error: 'Turma não encontrada' }, { status: 404 });

  const linkedCourses = await db.select({ courseId: cohortCourses.courseId }).from(cohortCourses).where(and(eq(cohortCourses.tenantId, tenantId), eq(cohortCourses.cohortId, id)));
  const linkedMembers = await db.select({ userId: cohortMembers.userId, joinedAt: cohortMembers.joinedAt }).from(cohortMembers).where(and(eq(cohortMembers.tenantId, tenantId), eq(cohortMembers.cohortId, id)));

  const allCourses = await db.select({ id: courses.id, title: courses.title, published: courses.published }).from(courses).where(eq(courses.tenantId, tenantId)).orderBy(asc(courses.title));
  const allUsers = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.tenantId, tenantId)).orderBy(asc(users.name));

  const courseSet = new Set(linkedCourses.map((c) => c.courseId));
  const memberSet = new Set(linkedMembers.map((m) => m.userId));

  return NextResponse.json({
    cohort,
    courses: allCourses.map((c) => ({ ...c, linked: courseSet.has(c.id) })),
    members: allUsers.map((u) => ({ ...u, linked: memberSet.has(u.id) })),
  });
}
