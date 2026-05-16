import { auth } from '@/auth';
import { db } from '@/db';
import { users, enrollments, courses, cohorts, cohortMembers, lessons, lessonProgress, modules, payments, subscriptions, invoices } from '@/db/schema';
import { eq, asc, sql, and, inArray, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getCourseStats } from '@/lib/course-stats';
import { getTenantId } from '@/lib/tenant';

function parseHHMMSSToSeconds(s: string | null): number {
  if (!s) return 0;
  const parts = s.split(':').map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatHours(seconds: number): string {
  const h = seconds / 3600;
  if (h < 1) return `${Math.round(seconds / 60)}min`;
  return `${h.toFixed(1)}h`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { id } = await params;
  const tenantId = await getTenantId();

  const [user] = await db.select().from(users).where(and(eq(users.tenantId, tenantId), eq(users.id, id))).limit(1);
  if (!user) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 });

  // Enrollments with course info
  const userEnrollments = await db
    .select({
      courseId: enrollments.courseId,
      progress: enrollments.progress,
      active: enrollments.active,
      enrolledAt: enrollments.enrolledAt,
      expiresAt: enrollments.expiresAt,
      lastAccessAt: enrollments.lastAccessAt,
      courseTitle: courses.title,
      coverBg: courses.coverBg,
      coverImage: courses.coverImage,
      coverGlyph: courses.coverGlyph,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.userId, id)));

  // All courses (for adding)
  const allCourses = await db
    .select({ id: courses.id, title: courses.title, published: courses.published, coverBg: courses.coverBg, coverImage: courses.coverImage, coverGlyph: courses.coverGlyph })
    .from(courses)
    .where(eq(courses.tenantId, tenantId))
    .orderBy(asc(courses.title));

  // Cohorts
  const userCohorts = await db
    .select({ id: cohorts.id, name: cohorts.name, color: cohorts.color })
    .from(cohortMembers)
    .innerJoin(cohorts, eq(cohortMembers.cohortId, cohorts.id))
    .where(and(eq(cohortMembers.tenantId, tenantId), eq(cohortMembers.userId, id)));

  // Compute lessons done + watched time across enrolled courses
  const enrolledCourseIds = userEnrollments.map((e) => e.courseId);
  let totalLessonsDone = 0;
  let totalWatchedSeconds = 0;
  const perCourseStats = new Map<string, { lessonsDone: number; totalLessons: number }>();

  if (enrolledCourseIds.length > 0) {
    // Total lessons done
    const doneCountByCourse = await db
      .select({
        courseId: modules.courseId,
        count: sql<number>`count(*)`,
      })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(and(
        eq(lessonProgress.tenantId, tenantId),
        eq(lessonProgress.userId, id),
        eq(lessonProgress.done, true),
        inArray(modules.courseId, enrolledCourseIds),
      ))
      .groupBy(modules.courseId);

    for (const r of doneCountByCourse) {
      perCourseStats.set(r.courseId, { lessonsDone: Number(r.count), totalLessons: 0 });
      totalLessonsDone += Number(r.count);
    }

    // Total lesson durations done by this user
    const userLessons = await db
      .select({ duration: lessons.duration })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .where(and(eq(lessonProgress.tenantId, tenantId), eq(lessonProgress.userId, id), eq(lessonProgress.done, true)));

    for (const l of userLessons) {
      totalWatchedSeconds += parseHHMMSSToSeconds(l.duration);
    }
  }

  // Real lesson counts from lessons table (overrides mocked courses.lessonCount)
  const statsMap = await getCourseStats(enrolledCourseIds);

  const enrolledSet = new Set(enrolledCourseIds);
  const totalProgress = userEnrollments.length > 0
    ? userEnrollments.reduce((a, e) => a + e.progress, 0) / userEnrollments.length
    : 0;

  // Payments and subscriptions
  const userPayments = await db
    .select()
    .from(payments)
    .where(and(eq(payments.tenantId, tenantId), eq(payments.userId, id)))
    .orderBy(desc(payments.dueDate));

  const userSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.userId, id)))
    .orderBy(desc(subscriptions.createdAt));

  const userInvoices = await db
    .select({
      id: invoices.id,
      status: invoices.status,
      numero: invoices.numero,
      valor: invoices.valor,
      pdfUrl: invoices.pdfUrl,
      errorMessage: invoices.errorMessage,
      createdAt: invoices.createdAt,
      paymentId: invoices.paymentId,
    })
    .from(invoices)
    .where(and(eq(invoices.tenantId, tenantId), eq(invoices.userId, id)))
    .orderBy(desc(invoices.createdAt));

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      level: user.level,
      xp: user.xp,
      streak: user.streak,
      phone: user.phone,
      location: user.location,
      cpfCnpj: user.cpfCnpj,
      asaasCustomerId: user.asaasCustomerId,
      suspended: user.suspended,
      termsAcceptedAt: user.termsAcceptedAt,
      createdAt: user.createdAt,
    },
    payments: userPayments,
    subscriptions: userSubscriptions,
    invoices: userInvoices,
    stats: {
      coursesEnrolled: userEnrollments.length,
      avgProgress: totalProgress,
      lessonsDone: totalLessonsDone,
      totalWatchedSeconds,
      totalWatchedLabel: formatHours(totalWatchedSeconds),
    },
    cohorts: userCohorts,
    enrollments: userEnrollments.map((e) => ({
      ...e,
      lessonCount: statsMap.get(e.courseId)?.lessonCount ?? 0,
      lessonsDone: perCourseStats.get(e.courseId)?.lessonsDone ?? 0,
    })),
    availableCourses: allCourses.filter((c) => !enrolledSet.has(c.id)),
  });
}
