'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { enrollments, lessonProgress, lessons, modules, notes, comments, courses, users, settings, cohorts, cohortCourses, cohortMembers, payments, subscriptions, checkouts } from '@/db/schema';
import bcrypt from 'bcryptjs';
import { asaasCreateCustomer, asaasUpdateCustomer, asaasCreatePayment, asaasDeletePayment, asaasGetPaymentPixQrCode, asaasCreateSubscription, asaasCancelSubscription, asaasListPaymentsByInstallment, mapAsaasStatusToOurs, type AsaasBillingType } from '@/lib/asaas';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

async function getSession() {
  const session = await auth();
  if (!session?.user) throw new Error('Não autenticado');
  return session;
}

export async function enrollInCourse(courseId: string) {
  const session = await getSession();
  const existing = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.userId, session.user.id), eq(enrollments.courseId, courseId)))
    .limit(1);
  if (existing.length) return;
  await db.insert(enrollments).values({
    id: nanoid(),
    userId: session.user.id,
    courseId,
  });
  revalidatePath('/catalog');
}

export async function markLessonDone(lessonId: string, done: boolean) {
  const session = await getSession();
  const userId = session.user.id;

  await db
    .insert(lessonProgress)
    .values({ userId, lessonId, done, completedAt: done ? new Date() : null })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: { done, completedAt: done ? new Date() : null },
    });

  // Update enrollment progress
  const [lesson] = await db
    .select({ moduleId: lessons.moduleId })
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (lesson) {
    const [mod] = await db
      .select({ courseId: modules.courseId })
      .from(modules)
      .where(eq(modules.id, lesson.moduleId))
      .limit(1);

    if (mod) {
      const totalLessons = await db
        .select({ count: sql<number>`count(*)` })
        .from(lessons)
        .innerJoin(modules, eq(lessons.moduleId, modules.id))
        .where(eq(modules.courseId, mod.courseId));

      const doneLessons = await db
        .select({ count: sql<number>`count(*)` })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
        .innerJoin(modules, eq(lessons.moduleId, modules.id))
        .where(and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.done, true),
          eq(modules.courseId, mod.courseId),
        ));

      const total = Number(totalLessons[0]?.count ?? 1);
      const doneCount = Number(doneLessons[0]?.count ?? 0);
      const progress = total > 0 ? doneCount / total : 0;

      await db
        .update(enrollments)
        .set({ progress, lastLessonId: lessonId, lastAccessAt: new Date() })
        .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, mod.courseId)));

      // XP reward
      if (done) {
        await db.update(users).set({ xp: sql`${users.xp} + 10` }).where(eq(users.id, userId));
      }

      revalidatePath(`/courses/${mod.courseId}`);
      revalidatePath(`/courses/${mod.courseId}/lessons/${lessonId}`);
    }
  }
}

export async function updateWatchedSeconds(lessonId: string, watchedSeconds: number) {
  const session = await getSession();
  const clamped = Math.max(0, Math.min(watchedSeconds, 86400));
  await db
    .insert(lessonProgress)
    .values({ userId: session.user.id, lessonId, watchedSeconds: clamped })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: { watchedSeconds: clamped },
    });
}

export async function addNote(lessonId: string, text: string, timestamp?: string) {
  const session = await getSession();
  await db.insert(notes).values({
    id: nanoid(),
    userId: session.user.id,
    lessonId,
    text,
    timestamp: timestamp ?? null,
  });
  revalidatePath(`/courses/[id]/lessons/${lessonId}`);
}

export async function deleteNote(noteId: string) {
  const session = await getSession();
  await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, session.user.id)));
}

export async function addComment(lessonId: string, text: string, parentId?: string, imageUrl?: string) {
  const session = await getSession();
  await db.insert(comments).values({
    id: nanoid(),
    userId: session.user.id,
    lessonId,
    text,
    imageUrl: imageUrl ?? null,
    parentId: parentId ?? null,
    status: 'approved',
  });
  revalidatePath(`/courses/[id]/lessons/${lessonId}`);
}

export async function deleteComment(commentId: string) {
  const session = await getSession();
  const [c] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  if (!c) throw new Error('Comentário não encontrado');
  if (c.userId !== session.user.id && session.user.role !== 'admin') {
    throw new Error('Sem permissão para excluir este comentário');
  }
  await db.delete(comments).where(eq(comments.id, commentId));
  revalidatePath(`/courses/[id]/lessons/${c.lessonId}`);
}

// ─── Admin actions ─────────────────────────────────────────────────────────

export async function adminCreateCourse(data: {
  title: string;
  subtitle?: string;
  description?: string;
  instructor: string;
  instructorRole?: string;
  level?: string;
  coverBg?: string;
  coverGlyph?: string;
  coverAccent?: string;
}) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');

  const id = nanoid();
  await db.insert(courses).values({
    id,
    title: data.title,
    subtitle: data.subtitle,
    description: data.description,
    instructor: data.instructor,
    instructorRole: data.instructorRole,
    level: data.level ?? 'Iniciante',
    coverBg: data.coverBg,
    coverGlyph: data.coverGlyph,
    coverAccent: data.coverAccent,
    published: false,
  });
  revalidatePath('/admin/courses');
  return id;
}

export async function adminUpdateCourse(id: string, data: Partial<typeof courses.$inferInsert>) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(courses).set({ ...data, updatedAt: new Date() }).where(eq(courses.id, id));
  revalidatePath('/admin/courses');
  revalidatePath(`/courses/${id}`);
}

export async function adminDeleteCourse(id: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.delete(courses).where(eq(courses.id, id));
  revalidatePath('/admin/courses');
}

export async function adminModerateComment(id: string, status: 'approved' | 'rejected') {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(comments).set({ status }).where(eq(comments.id, id));
  revalidatePath('/admin/comments');
}

export async function adminToggleCoursePublished(id: string, published: boolean) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(courses).set({ published, updatedAt: new Date() }).where(eq(courses.id, id));
  revalidatePath('/admin/courses');
}

export async function adminUpdateLesson(lessonId: string, data: {
  title?: string;
  duration?: string;
  bunnyVideoId?: string;
  pandaVideoId?: string;
  videoUrl?: string;
  transcript?: string;
  aiSummary?: string;
  content?: string;
  published?: boolean;
  allowComments?: boolean;
}) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(lessons).set({ ...data, updatedAt: new Date() }).where(eq(lessons.id, lessonId));
  const [lesson] = await db.select({ moduleId: lessons.moduleId }).from(lessons).where(eq(lessons.id, lessonId));
  if (lesson) {
    const [mod] = await db.select({ courseId: modules.courseId }).from(modules).where(eq(modules.id, lesson.moduleId));
    if (mod) revalidatePath(`/courses/${mod.courseId}/lessons/${lessonId}`);
  }
  revalidatePath('/admin/courses');
}

export async function adminCreateLesson(moduleId: string, data: { title: string; type?: 'video' | 'quiz'; duration?: string }) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  const [mod] = await db.select({ courseId: modules.courseId }).from(modules).where(eq(modules.id, moduleId));
  if (!mod) throw new Error('Módulo não encontrado');

  const existing = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.moduleId, moduleId));
  const id = nanoid();
  await db.insert(lessons).values({
    id,
    moduleId,
    title: data.title,
    type: data.type ?? 'video',
    duration: data.duration,
    position: existing.length,
    published: false,
  });

  // update lesson count
  await db.update(courses)
    .set({ lessonCount: sql`${courses.lessonCount} + 1`, updatedAt: new Date() })
    .where(eq(courses.id, mod.courseId));

  revalidatePath(`/admin/courses/${mod.courseId}/lessons`);
  return id;
}

export async function adminDeleteLesson(lessonId: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  const [lesson] = await db.select({ moduleId: lessons.moduleId }).from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson) return;
  const [mod] = await db.select({ courseId: modules.courseId }).from(modules).where(eq(modules.id, lesson.moduleId));
  await db.delete(lessons).where(eq(lessons.id, lessonId));
  if (mod) {
    await db.update(courses)
      .set({ lessonCount: sql`greatest(${courses.lessonCount} - 1, 0)`, updatedAt: new Date() })
      .where(eq(courses.id, mod.courseId));
    revalidatePath(`/admin/courses/${mod.courseId}/lessons`);
  }
}

export async function adminUpdateUser(userId: string, data: {
  name?: string;
  email?: string;
  role?: 'admin' | 'student';
  plan?: 'free' | 'monthly' | 'annual' | 'lifetime';
  level?: number;
  xp?: number;
  streak?: number;
  phone?: string;
  location?: string;
  cpfCnpj?: string;
}) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
  revalidatePath('/admin/students');
}

export async function adminDeleteUser(userId: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  if (session.user.id === userId) throw new Error('Você não pode excluir sua própria conta');
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath('/admin/students');
}

export async function adminToggleUserSuspended(userId: string, suspended: boolean) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(users).set({ suspended, updatedAt: new Date() }).where(eq(users.id, userId));
  revalidatePath('/admin/students');
  revalidatePath(`/admin/students/${userId}`);
}

export async function adminUpdateEnrollment(userId: string, courseId: string, data: {
  active?: boolean;
  expiresAt?: Date | null;
}) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(enrollments).set(data).where(
    and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))
  );
  revalidatePath(`/admin/students/${userId}`);
}

export async function adminAddEnrollment(userId: string, courseId: string, expiresAt?: Date | null) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.insert(enrollments).values({
    id: nanoid(),
    userId,
    courseId,
    expiresAt: expiresAt ?? null,
    active: true,
  });
  revalidatePath(`/admin/students/${userId}`);
}

export async function adminRemoveEnrollment(userId: string, courseId: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.delete(enrollments).where(
    and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))
  );
  revalidatePath(`/admin/students/${userId}`);
}

export async function adminSetEnrollments(userId: string, courseIds: string[]) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');

  const existing = await db
    .select({ courseId: enrollments.courseId })
    .from(enrollments)
    .where(eq(enrollments.userId, userId));

  const existingSet = new Set(existing.map((e) => e.courseId));
  const newSet = new Set(courseIds);

  // Remove unenrolled
  for (const courseId of existingSet) {
    if (!newSet.has(courseId)) {
      await db.delete(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)));
    }
  }

  // Add new
  for (const courseId of newSet) {
    if (!existingSet.has(courseId)) {
      await db.insert(enrollments).values({ id: nanoid(), userId, courseId });
    }
  }

  revalidatePath('/admin/students');
}

// ─── Cohorts (Turmas) ──────────────────────────────────────────────────────

export async function adminCreateCohort(data: { name: string; description?: string; color?: string }) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  const id = nanoid();
  await db.insert(cohorts).values({
    id,
    name: data.name,
    description: data.description,
    color: data.color,
  });
  revalidatePath('/admin/cohorts');
  return id;
}

export async function adminUpdateCohort(id: string, data: {
  name?: string;
  description?: string;
  color?: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
}) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(cohorts).set({ ...data, updatedAt: new Date() }).where(eq(cohorts.id, id));
  revalidatePath('/admin/cohorts');
}

export async function adminDeleteCohort(id: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.delete(cohorts).where(eq(cohorts.id, id));
  revalidatePath('/admin/cohorts');
}

export async function adminSetCohortCourses(cohortId: string, courseIds: string[]) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.delete(cohortCourses).where(eq(cohortCourses.cohortId, cohortId));
  if (courseIds.length > 0) {
    await db.insert(cohortCourses).values(courseIds.map((courseId) => ({ cohortId, courseId })));
  }
  revalidatePath('/admin/cohorts');
}

export async function adminSetCohortMembers(cohortId: string, userIds: string[]) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.delete(cohortMembers).where(eq(cohortMembers.cohortId, cohortId));
  if (userIds.length > 0) {
    await db.insert(cohortMembers).values(userIds.map((userId) => ({ cohortId, userId })));
  }
  revalidatePath('/admin/cohorts');
}

// ─── Reorder ───────────────────────────────────────────────────────────────

export async function adminReorderLessons(moduleId: string, lessonIds: string[]) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  for (let i = 0; i < lessonIds.length; i++) {
    await db.update(lessons)
      .set({ position: i, moduleId })
      .where(and(eq(lessons.id, lessonIds[i]), eq(lessons.moduleId, moduleId)));
  }
  const [mod] = await db.select({ courseId: modules.courseId }).from(modules).where(eq(modules.id, moduleId));
  if (mod) revalidatePath(`/admin/courses/${mod.courseId}/edit`);
}

export async function adminReorderModules(courseId: string, moduleIds: string[]) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  for (let i = 0; i < moduleIds.length; i++) {
    await db.update(modules).set({ position: i }).where(eq(modules.id, moduleIds[i]));
  }
  revalidatePath(`/admin/courses/${courseId}/edit`);
}

export async function adminCreateModule(courseId: string, title: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  const existing = await db.select({ id: modules.id }).from(modules).where(eq(modules.courseId, courseId));
  const id = nanoid();
  await db.insert(modules).values({
    id,
    courseId,
    title,
    position: existing.length,
  });
  await db.update(courses)
    .set({ moduleCount: sql`${courses.moduleCount} + 1`, updatedAt: new Date() })
    .where(eq(courses.id, courseId));
  revalidatePath(`/admin/courses/${courseId}/edit`);
  return id;
}

export async function adminUpdateModule(moduleId: string, data: { title?: string; duration?: string }) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(modules).set(data).where(eq(modules.id, moduleId));
  const [mod] = await db.select({ courseId: modules.courseId }).from(modules).where(eq(modules.id, moduleId));
  if (mod) revalidatePath(`/admin/courses/${mod.courseId}/edit`);
}

export async function adminDeleteModule(moduleId: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  const [mod] = await db.select({ courseId: modules.courseId }).from(modules).where(eq(modules.id, moduleId));
  const moduleLessons = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.moduleId, moduleId));
  await db.delete(modules).where(eq(modules.id, moduleId));
  if (mod) {
    await db.update(courses).set({
      moduleCount: sql`greatest(${courses.moduleCount} - 1, 0)`,
      lessonCount: sql`greatest(${courses.lessonCount} - ${moduleLessons.length}, 0)`,
      updatedAt: new Date(),
    }).where(eq(courses.id, mod.courseId));
    revalidatePath(`/admin/courses/${mod.courseId}/edit`);
  }
}

export async function adminUpdateLessonTitle(lessonId: string, title: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(lessons).set({ title, updatedAt: new Date() }).where(eq(lessons.id, lessonId));
  const [lesson] = await db.select({ moduleId: lessons.moduleId }).from(lessons).where(eq(lessons.id, lessonId));
  if (lesson) {
    const [mod] = await db.select({ courseId: modules.courseId }).from(modules).where(eq(modules.id, lesson.moduleId));
    if (mod) revalidatePath(`/admin/courses/${mod.courseId}/edit`);
  }
}

export async function saveSettings(data: Record<string, string>) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  for (const [key, value] of Object.entries(data)) {
    await db.insert(settings).values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  }
  revalidatePath('/admin/settings');
}

// ─── Asaas: Customer sync ─────────────────────────────────────────────

async function ensureAsaasCustomer(userId: string): Promise<string> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error('Aluno não encontrado');
  if (!user.cpfCnpj) throw new Error('Aluno sem CPF/CNPJ cadastrado. Adicione antes de criar cobrança.');

  if (user.asaasCustomerId) {
    // Update existing customer with current data
    try {
      await asaasUpdateCustomer(user.asaasCustomerId, {
        name: user.name,
        email: user.email,
        cpfCnpj: user.cpfCnpj,
        phone: user.phone ?? undefined,
        externalReference: user.id,
      });
    } catch { /* ignore update errors */ }
    return user.asaasCustomerId;
  }

  const created = await asaasCreateCustomer({
    name: user.name,
    email: user.email,
    cpfCnpj: user.cpfCnpj,
    phone: user.phone ?? undefined,
    externalReference: user.id,
  });

  await db.update(users).set({ asaasCustomerId: created.id, updatedAt: new Date() }).where(eq(users.id, userId));
  return created.id;
}

export async function adminSyncAsaasCustomer(userId: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  const id = await ensureAsaasCustomer(userId);
  revalidatePath(`/admin/students/${userId}`);
  return id;
}

// ─── Asaas: Create one-time charge (with installments) ───────────────

export async function adminCreateAsaasCharge(userId: string, data: {
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  courseId?: string;
  installmentCount?: number; // For credit card installments
}) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');

  const customerId = await ensureAsaasCustomer(userId);

  const useInstallments = data.installmentCount && data.installmentCount > 1 && data.billingType === 'CREDIT_CARD';

  const payment = await asaasCreatePayment({
    customer: customerId,
    billingType: data.billingType,
    value: useInstallments ? data.value / data.installmentCount! : data.value,
    totalValue: useInstallments ? data.value : undefined,
    installmentCount: useInstallments ? data.installmentCount : undefined,
    dueDate: data.dueDate,
    description: data.description,
    externalReference: userId,
  });

  // If installments, fetch all child payments and persist them
  // If single payment, persist that one
  // Note: For installments via the API, Asaas returns the "installment plan" id in installment field
  // but the actual payments are listed separately
  if (useInstallments) {
    const list = await asaasListPaymentsByInstallment(payment.installment ?? payment.id);
    for (const p of list.data) {
      await db.insert(payments).values({
        id: nanoid(),
        userId,
        asaasPaymentId: p.id,
        courseId: data.courseId,
        value: p.value,
        netValue: p.netValue,
        billingType: data.billingType,
        status: mapAsaasStatusToOurs(p.status),
        description: p.description ?? data.description,
        invoiceUrl: p.invoiceUrl,
        installmentCount: data.installmentCount,
        installmentNumber: p.installmentNumber,
        installmentValue: p.value,
        dueDate: new Date(p.dueDate),
      });
    }
  } else {
    const insertData: typeof payments.$inferInsert = {
      id: nanoid(),
      userId,
      asaasPaymentId: payment.id,
      courseId: data.courseId,
      value: payment.value,
      netValue: payment.netValue,
      billingType: data.billingType,
      status: mapAsaasStatusToOurs(payment.status),
      description: payment.description ?? data.description,
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      dueDate: new Date(payment.dueDate),
    };
    // Fetch PIX QR code if PIX billing
    if (data.billingType === 'PIX') {
      try {
        const qr = await asaasGetPaymentPixQrCode(payment.id);
        insertData.pixQrCode = qr.encodedImage;
        insertData.pixPayload = qr.payload;
      } catch { /* PIX may not be immediately available */ }
    }
    await db.insert(payments).values(insertData);
  }

  revalidatePath(`/admin/students/${userId}`);
  return { ok: true };
}

// ─── Asaas: Subscription ─────────────────────────────────────────────

export async function adminCreateAsaasSubscription(userId: string, data: {
  plan: 'monthly' | 'annual' | 'lifetime' | 'free';
  cycle: 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  description?: string;
}) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');

  const customerId = await ensureAsaasCustomer(userId);

  const sub = await asaasCreateSubscription({
    customer: customerId,
    billingType: data.billingType,
    value: data.value,
    nextDueDate: data.nextDueDate,
    cycle: data.cycle,
    description: data.description,
    externalReference: userId,
  });

  await db.insert(subscriptions).values({
    id: nanoid(),
    userId,
    asaasSubscriptionId: sub.id,
    plan: data.plan,
    cycle: data.cycle,
    billingType: data.billingType,
    value: data.value,
    description: data.description,
    nextDueDate: new Date(data.nextDueDate),
  });

  // Update user's plan immediately
  await db.update(users).set({ plan: data.plan, updatedAt: new Date() }).where(eq(users.id, userId));

  revalidatePath(`/admin/students/${userId}`);
  return { ok: true };
}

export async function adminCancelAsaasSubscription(subscriptionId: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!sub) throw new Error('Assinatura não encontrada');

  if (sub.asaasSubscriptionId) {
    try { await asaasCancelSubscription(sub.asaasSubscriptionId); } catch { /* may be already cancelled */ }
  }

  await db.update(subscriptions)
    .set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId));

  revalidatePath(`/admin/students/${sub.userId}`);
}

// ─── Asaas: Delete payment ───────────────────────────────────────────

export async function adminDeleteAsaasPayment(paymentId: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');

  const [p] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!p) throw new Error('Cobrança não encontrada');

  if (p.asaasPaymentId) {
    try { await asaasDeletePayment(p.asaasPaymentId); } catch { /* may be already cancelled */ }
  }
  await db.update(payments).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(payments.id, paymentId));

  revalidatePath(`/admin/students/${p.userId}`);
}

// ─── Checkouts (públicos por curso) ──────────────────────────────────

const DEFAULT_STUDENT_PASSWORD = '123321';


function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function adminUpsertCheckout(data: {
  id?: string;
  courseId: string;
  slug?: string;
  active: boolean;
  price: number;
  headline?: string;
  description?: string;
  allowPix: boolean;
  allowBoleto: boolean;
  allowCreditCard: boolean;
  maxInstallments: number;
}) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');

  const [course] = await db.select().from(courses).where(eq(courses.id, data.courseId)).limit(1);
  if (!course) throw new Error('Curso não encontrado');

  // Build slug if missing — base on course title; uniqueness ensured by suffix
  let slug = data.slug?.trim() || slugify(course.title);
  if (!slug) slug = `c-${nanoid(6)}`;

  // Ensure unique slug if creating
  if (!data.id) {
    let candidate = slug;
    let n = 1;
    while ((await db.select().from(checkouts).where(eq(checkouts.slug, candidate)).limit(1)).length) {
      candidate = `${slug}-${n++}`;
    }
    slug = candidate;
  }

  if (data.id) {
    await db.update(checkouts).set({
      slug,
      active: data.active,
      price: data.price,
      headline: data.headline,
      description: data.description,
      allowPix: data.allowPix,
      allowBoleto: data.allowBoleto,
      allowCreditCard: data.allowCreditCard,
      maxInstallments: data.maxInstallments,
      updatedAt: new Date(),
    }).where(eq(checkouts.id, data.id));
  } else {
    await db.insert(checkouts).values({
      id: nanoid(),
      courseId: data.courseId,
      slug,
      active: data.active,
      price: data.price,
      headline: data.headline,
      description: data.description,
      allowPix: data.allowPix,
      allowBoleto: data.allowBoleto,
      allowCreditCard: data.allowCreditCard,
      maxInstallments: data.maxInstallments,
    });
  }

  revalidatePath('/admin/checkouts');
  return { slug };
}

export async function adminDeleteCheckout(id: string) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.delete(checkouts).where(eq(checkouts.id, id));
  revalidatePath('/admin/checkouts');
}

export async function adminToggleCheckoutActive(id: string, active: boolean) {
  const session = await getSession();
  if (session.user.role !== 'admin') throw new Error('Acesso negado');
  await db.update(checkouts).set({ active, updatedAt: new Date() }).where(eq(checkouts.id, id));
  revalidatePath('/admin/checkouts');
}

// ─── Public checkout: create charge + user (no auth) ─────────────────

export async function createPublicCheckoutCharge(slug: string, data: {
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  postalCode: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  installmentCount?: number;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}): Promise<{ ok: true; paymentId: string }> {
  const [co] = await db.select().from(checkouts).where(eq(checkouts.slug, slug)).limit(1);
  if (!co || !co.active) throw new Error('Checkout indisponível.');

  const [course] = await db.select({ title: courses.title }).from(courses).where(eq(courses.id, co.courseId)).limit(1);
  const productDescription = co.headline?.trim() || (course ? `Acesso ao curso: ${course.title}` : 'Acesso ao curso');

  if (data.billingType === 'PIX' && !co.allowPix) throw new Error('PIX não permitido para este checkout.');
  if (data.billingType === 'BOLETO' && !co.allowBoleto) throw new Error('Boleto não permitido para este checkout.');
  if (data.billingType === 'CREDIT_CARD' && !co.allowCreditCard) throw new Error('Cartão não permitido para este checkout.');

  const installments = data.billingType === 'CREDIT_CARD'
    ? Math.min(Math.max(data.installmentCount ?? 1, 1), co.maxInstallments)
    : 1;

  // Find or create user
  let [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  if (!user) {
    const hash = await bcrypt.hash(DEFAULT_STUDENT_PASSWORD, 12);
    const userId = nanoid();
    await db.insert(users).values({
      id: userId,
      name: data.name,
      email: data.email,
      passwordHash: hash,
      cpfCnpj: data.cpfCnpj,
      phone: data.phone,
    });
    [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  } else {
    // Update CPF/phone if missing
    const patch: Partial<typeof users.$inferInsert> = {};
    if (!user.cpfCnpj) patch.cpfCnpj = data.cpfCnpj;
    if (!user.phone && data.phone) patch.phone = data.phone;
    if (Object.keys(patch).length) {
      await db.update(users).set({ ...patch, updatedAt: new Date() }).where(eq(users.id, user.id));
      user = { ...user, ...patch };
    }
  }

  // Ensure Asaas customer (re-use admin helper logic inline since user may have just been created)
  let asaasCustomerId = user.asaasCustomerId;
  if (!asaasCustomerId) {
    const created = await asaasCreateCustomer({
      name: user.name,
      email: user.email,
      cpfCnpj: data.cpfCnpj,
      phone: data.phone,
      mobilePhone: data.phone,
      postalCode: data.postalCode,
      externalReference: user.id,
    });
    asaasCustomerId = created.id;
    await db.update(users).set({ asaasCustomerId, updatedAt: new Date() }).where(eq(users.id, user.id));
  } else {
    try {
      await asaasUpdateCustomer(asaasCustomerId, {
        name: user.name,
        email: user.email,
        cpfCnpj: data.cpfCnpj,
        phone: data.phone,
        mobilePhone: data.phone,
        postalCode: data.postalCode,
      });
    } catch { /* ignore update errors */ }
  }

  const useInstallments = installments > 1 && data.billingType === 'CREDIT_CARD';
  const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const payment = await asaasCreatePayment({
    customer: asaasCustomerId,
    billingType: data.billingType,
    value: useInstallments ? co.price / installments : co.price,
    totalValue: useInstallments ? co.price : undefined,
    installmentCount: useInstallments ? installments : undefined,
    dueDate,
    description: productDescription,
    externalReference: `checkout:${co.id}:user:${user.id}:course:${co.courseId}`,
    creditCard: data.creditCard ? {
      holderName: data.creditCard.holderName,
      number: data.creditCard.number.replace(/\s+/g, ''),
      expiryMonth: data.creditCard.expiryMonth,
      expiryYear: data.creditCard.expiryYear,
      ccv: data.creditCard.ccv,
    } : undefined,
    creditCardHolderInfo: data.creditCard ? {
      name: data.creditCard.holderName,
      email: user.email,
      cpfCnpj: data.cpfCnpj,
      postalCode: data.postalCode,
      addressNumber: 'S/N',
      phone: data.phone,
    } : undefined,
  });

  // Persist payment(s)
  let paymentRowId = nanoid();
  if (useInstallments) {
    const list = await asaasListPaymentsByInstallment(payment.installment ?? payment.id);
    const sorted = [...list.data].sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0));
    let firstId: string | null = null;
    for (const p of sorted) {
      const rowId = nanoid();
      if (firstId === null) firstId = rowId;
      await db.insert(payments).values({
        id: rowId,
        userId: user.id,
        asaasPaymentId: p.id,
        courseId: co.courseId,
        value: p.value,
        netValue: p.netValue,
        billingType: data.billingType,
        status: mapAsaasStatusToOurs(p.status),
        description: p.description ?? co.headline,
        invoiceUrl: p.invoiceUrl,
        installmentCount: installments,
        installmentNumber: p.installmentNumber,
        installmentValue: p.value,
        dueDate: new Date(p.dueDate),
      });
    }
    if (firstId) paymentRowId = firstId;
  } else {
    const insertData: typeof payments.$inferInsert = {
      id: paymentRowId,
      userId: user.id,
      asaasPaymentId: payment.id,
      courseId: co.courseId,
      value: payment.value,
      netValue: payment.netValue,
      billingType: data.billingType,
      status: mapAsaasStatusToOurs(payment.status),
      description: payment.description ?? co.headline,
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      dueDate: new Date(payment.dueDate),
    };
    if (data.billingType === 'PIX') {
      try {
        const qr = await asaasGetPaymentPixQrCode(payment.id);
        insertData.pixQrCode = qr.encodedImage;
        insertData.pixPayload = qr.payload;
      } catch { /* PIX may not be immediately available */ }
    }
    await db.insert(payments).values(insertData);
  }

  // If the charge is already confirmed (e.g. credit card auto-approved), enroll right away.
  const ours = mapAsaasStatusToOurs(payment.status);
  if (ours === 'received' || ours === 'confirmed') {
    const existing = await db.select().from(enrollments)
      .where(and(eq(enrollments.userId, user.id), eq(enrollments.courseId, co.courseId)))
      .limit(1);
    if (!existing.length) {
      await db.insert(enrollments).values({
        id: nanoid(),
        userId: user.id,
        courseId: co.courseId,
        active: true,
      });
    }
  }

  return { ok: true, paymentId: paymentRowId };
}
