import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  pgEnum,
  primaryKey,
  unique,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['admin', 'student']);
export const lessonTypeEnum = pgEnum('lesson_type', ['video', 'quiz']);
export const commentStatusEnum = pgEnum('comment_status', ['pending', 'approved', 'rejected']);
export const planEnum = pgEnum('plan', ['monthly', 'annual', 'lifetime', 'free']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 'received', 'confirmed', 'overdue', 'refunded', 'cancelled', 'failed',
]);
export const billingTypeEnum = pgEnum('billing_type', ['PIX', 'BOLETO', 'CREDIT_CARD', 'UNDEFINED']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'inactive', 'expired', 'cancelled']);
export const subscriptionCycleEnum = pgEnum('subscription_cycle', [
  'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY',
]);

// ─── Tenants (multi-tenant) ─────────────────────────────────────────────────────

/** ID do tenant padrão — recebe todos os dados pré-existentes (single-tenant → multi). */
export const DEFAULT_TENANT_ID = 'tnt_default';

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),       // subdomínio
  customDomain: varchar('custom_domain', { length: 255 }).unique(), // domínio próprio (futuro)
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Neon Auth managed
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('student'),
  passwordHash: text('password_hash'),
  plan: planEnum('plan').notNull().default('free'),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  streak: integer('streak').notNull().default(0),
  location: varchar('location', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  cpfCnpj: varchar('cpf_cnpj', { length: 30 }),
  asaasCustomerId: varchar('asaas_customer_id', { length: 100 }),
  suspended: boolean('suspended').notNull().default(false),
  termsAcceptedAt: timestamp('terms_accepted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [unique('users_tenant_email_unique').on(t.tenantId, t.email)]);

// ─── Courses ──────────────────────────────────────────────────────────────────

export const courses = pgTable('courses', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  subtitle: varchar('subtitle', { length: 500 }),
  description: text('description'),
  instructor: varchar('instructor', { length: 255 }).notNull(),
  instructorRole: varchar('instructor_role', { length: 255 }),
  level: varchar('level', { length: 50 }).notNull().default('Iniciante'),
  duration: varchar('duration', { length: 50 }),
  lessonCount: integer('lesson_count').notNull().default(0),
  moduleCount: integer('module_count').notNull().default(0),
  rating: real('rating').notNull().default(0),
  students: integer('students').notNull().default(0),
  coverBg: text('cover_bg'),
  coverImage: text('cover_image'),
  coverGlyph: varchar('cover_glyph', { length: 10 }),
  coverAccent: varchar('cover_accent', { length: 20 }),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const courseTags = pgTable('course_tags', {
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 100 }).notNull(),
}, (t) => [primaryKey({ columns: [t.courseId, t.tag] })]);

// ─── Modules ──────────────────────────────────────────────────────────────────

export const modules = pgTable('modules', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  position: integer('position').notNull().default(0),
  duration: varchar('duration', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Lessons ──────────────────────────────────────────────────────────────────

export const lessons = pgTable('lessons', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  moduleId: text('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  type: lessonTypeEnum('type').notNull().default('video'),
  position: integer('position').notNull().default(0),
  duration: varchar('duration', { length: 20 }),
  videoUrl: text('video_url'),
  bunnyVideoId: text('bunny_video_id'),
  pandaVideoId: text('panda_video_id'),
  content: text('content'),
  transcript: text('transcript'),
  aiSummary: text('ai_summary'),
  chapters: text('chapters'), // JSON: [{ time: number (segundos), title: string }]
  allowComments: boolean('allow_comments').notNull().default(true),
  allowDownload: boolean('allow_download').notNull().default(false),
  required: boolean('required').notNull().default(true),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Materials ────────────────────────────────────────────────────────────────

export const materials = pgTable('materials', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  url: text('url').notNull(),
  size: varchar('size', { length: 50 }),
  type: varchar('type', { length: 20 }).notNull().default('PDF'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Enrollments ──────────────────────────────────────────────────────────────

export const enrollments = pgTable('enrollments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  progress: real('progress').notNull().default(0),
  lastLessonId: text('last_lesson_id'),
  active: boolean('active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
  lastAccessAt: timestamp('last_access_at').notNull().defaultNow(),
});

// ─── Lesson Progress ──────────────────────────────────────────────────────────

export const lessonProgress = pgTable('lesson_progress', {
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  done: boolean('done').notNull().default(false),
  watchedSeconds: integer('watched_seconds').notNull().default(0),
  completedAt: timestamp('completed_at'),
}, (t) => [primaryKey({ columns: [t.userId, t.lessonId] })]);

// ─── Notes ────────────────────────────────────────────────────────────────────

export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  timestamp: varchar('timestamp', { length: 10 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Comments ─────────────────────────────────────────────────────────────────

export const comments = pgTable('comments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  lessonId: text('lesson_id').notNull().references(() => lessons.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  parentId: text('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  imageUrl: text('image_url'),
  status: commentStatusEnum('status').notNull().default('pending'),
  likes: integer('likes').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Achievements ─────────────────────────────────────────────────────────────

export const achievements = pgTable('achievements', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }).notNull(),
  xpReward: integer('xp_reward').notNull().default(0),
});

export const userAchievements = pgTable('user_achievements', {
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  achievementId: text('achievement_id').notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  earnedAt: timestamp('earned_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.achievementId] })]);

// ─── Trails ───────────────────────────────────────────────────────────────────

export const trails = pgTable('trails', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  color: varchar('color', { length: 20 }),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const trailCourses = pgTable('trail_courses', {
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  trailId: text('trail_id').notNull().references(() => trails.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.trailId, t.courseId] })]);

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = pgTable('settings', {
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 100 }).notNull(),
  value: text('value'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.tenantId, t.key] })]);

// ─── Payments & Subscriptions (Asaas) ────────────────────────────────────────

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  asaasSubscriptionId: varchar('asaas_subscription_id', { length: 100 }),
  plan: planEnum('plan').notNull(),
  cycle: subscriptionCycleEnum('cycle').notNull(),
  value: real('value').notNull(),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  billingType: billingTypeEnum('billing_type').notNull().default('UNDEFINED'),
  description: text('description'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  nextDueDate: timestamp('next_due_date'),
  cancelledAt: timestamp('cancelled_at'),
  endsAt: timestamp('ends_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  asaasPaymentId: varchar('asaas_payment_id', { length: 100 }),
  subscriptionId: text('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
  value: real('value').notNull(),
  netValue: real('net_value'),
  billingType: billingTypeEnum('billing_type').notNull().default('UNDEFINED'),
  status: paymentStatusEnum('status').notNull().default('pending'),
  description: text('description'),
  invoiceUrl: text('invoice_url'),
  bankSlipUrl: text('bank_slip_url'),
  pixQrCode: text('pix_qr_code'),
  pixPayload: text('pix_payload'),
  installmentNumber: integer('installment_number'), // ex: 2 (of 12)
  installmentCount: integer('installment_count'),   // ex: 12
  installmentValue: real('installment_value'),
  dueDate: timestamp('due_date').notNull(),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Checkouts (página de vendas pública por curso) ──────────────────────────

export const checkouts = pgTable('checkouts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }).unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  active: boolean('active').notNull().default(true),
  price: real('price').notNull(),
  headline: varchar('headline', { length: 255 }),
  description: text('description'),
  allowPix: boolean('allow_pix').notNull().default(true),
  allowBoleto: boolean('allow_boleto').notNull().default(true),
  allowCreditCard: boolean('allow_credit_card').notNull().default(true),
  maxInstallments: integer('max_installments').notNull().default(12),
  socialProof: boolean('social_proof').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Checkout offers (preços alternativos com link próprio) ──────────────────

export const checkoutOffers = pgTable('checkout_offers', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  checkoutId: text('checkout_id').notNull().references(() => checkouts.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  price: real('price').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ─── Coupons (cupons de desconto por checkout) ───────────────────────────────

export const discountTypeEnum = pgEnum('discount_type', ['percent', 'fixed']);

export const coupons = pgTable('coupons', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  checkoutId: text('checkout_id').notNull().references(() => checkouts.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  discountType: discountTypeEnum('discount_type').notNull(),
  discountValue: real('discount_value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Cohorts (Turmas) ─────────────────────────────────────────────────────────

export const cohorts = pgTable('cohorts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 20 }),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const cohortCourses = pgTable('cohort_courses', {
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  cohortId: text('cohort_id').notNull().references(() => cohorts.id, { onDelete: 'cascade' }),
  courseId: text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.cohortId, t.courseId] })]);

export const cohortMembers = pgTable('cohort_members', {
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  cohortId: text('cohort_id').notNull().references(() => cohorts.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.cohortId, t.userId] })]);

// ─── Relations ────────────────────────────────────────────────────────────────

export const coursesRelations = relations(courses, ({ many }) => ({
  modules: many(modules),
  tags: many(courseTags),
  enrollments: many(enrollments),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, { fields: [modules.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, { fields: [lessons.moduleId], references: [modules.id] }),
  materials: many(materials),
  comments: many(comments),
  notes: many(notes),
  progress: many(lessonProgress),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  user: one(users, { fields: [enrollments.userId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  enrollments: many(enrollments),
  lessonProgress: many(lessonProgress),
  notes: many(notes),
  comments: many(comments),
  achievements: many(userAchievements),
}));
