import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, enrollments, courses, userAchievements, achievements, lessonProgress, lessons, modules } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { getCourseStats, type CourseStats } from '@/lib/course-stats';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const userId = session.user.id;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userEnrollments = await db
    .select({
      enrollment: enrollments,
      course: courses,
    })
    .from(enrollments)
    .innerJoin(courses, eq(enrollments.courseId, courses.id))
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.lastAccessAt));

  const earnedCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const doneCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.done, true)));

  const xpPct = user ? user.xp / Math.max(user.xp + 1220, 5500) : 0;
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const firstName = user?.name.split(' ')[0] ?? '';
  const doneLesson = Number(doneCount[0]?.count ?? 0);
  const achievedCount = Number(earnedCount[0]?.count ?? 0);

  const continueEnrollment = userEnrollments.find((e) => e.enrollment.progress > 0 && e.enrollment.progress < 1);

  const statsMap = await getCourseStats(userEnrollments.map(({ course }) => course.id));

  return (
    <div className="content content-wide fade-up">
      {/* Greeting */}
      <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div className="eyebrow">{today}</div>
          <h1 className="h1-serif mt-8">
            Bem-vindo de volta, <em style={{ fontStyle: 'italic' }}>{firstName}</em>.
          </h1>
          {continueEnrollment && (
            <p className="muted mt-8" style={{ fontSize: 15, maxWidth: 540 }}>
              Continue de onde parou em <strong style={{ color: 'var(--text)' }}>{continueEnrollment.course.title}</strong>.
            </p>
          )}
        </div>
        {user && (
          <div className="row gap-8">
            <div className="chip"><Icon name="flame" size={13} /> {user.streak} dias seguidos</div>
          </div>
        )}
      </div>

      {/* Continue + XP */}
      {continueEnrollment && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, marginTop: 32 }}>
          <ContinueCard enrollment={continueEnrollment.enrollment} course={continueEnrollment.course} stats={statsMap.get(continueEnrollment.course.id)} />
          <XpCard user={user} xpPct={xpPct} achievedCount={achievedCount} />
        </div>
      )}

      {/* Stats */}
      <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: continueEnrollment ? 12 : 32 }}>
        <StatCard icon="clock" value={`${user?.xp ?? 0}`} label="XP total" />
        <StatCard icon="check-circle" value={String(doneLesson)} label="aulas concluídas" />
        <StatCard icon="flame" value={String(user?.streak ?? 0)} label="dias seguidos" />
        <StatCard icon="trophy" value={String(achievedCount)} label="conquistas" />
      </div>

      {/* Courses */}
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 40, marginBottom: 16 }}>
        <h2 className="h2">Continue de onde parou</h2>
        <Link href="/catalog" className="btn btn-ghost btn-sm">
          Ver todos <Icon name="arrow-right" size={14} />
        </Link>
      </div>

      {userEnrollments.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Icon name="courses" size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 16px' }} />
          <h3 className="h3" style={{ marginBottom: 8 }}>Nenhum curso ainda</h3>
          <p className="muted" style={{ fontSize: 14, marginBottom: 20 }}>Explore o catálogo e comece seu aprendizado.</p>
          <Link href="/catalog" className="btn btn-accent">Ver catálogo</Link>
        </div>
      ) : (
        <div className="dashboard-courses" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {userEnrollments.map(({ enrollment, course }) => (
            <CourseCard key={course.id} course={course} progress={enrollment.progress} stats={statsMap.get(course.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContinueCard({ enrollment, course, stats }: { enrollment: typeof enrollments.$inferSelect; course: typeof courses.$inferSelect; stats?: CourseStats }) {
  const pct = Math.round(enrollment.progress * 100);
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '200px 1fr' }}>
      <div style={{ background: course.coverBg ?? '#1e1b4b', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 100% 100%, rgba(255,255,255,0.18), transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.92)', fontFamily: 'var(--font-display)', fontSize: 64, letterSpacing: '-0.04em' }}>
          {course.coverGlyph}
        </div>
        <Link
          href={enrollment.lastLessonId ? `/courses/${course.id}/lessons/${enrollment.lastLessonId}` : `/courses/${course.id}`}
          style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', color: '#18181b', display: 'grid', placeItems: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
        >
          <Icon name="play" size={22} />
        </Link>
      </div>
      <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column' }}>
        <div className="eyebrow">Continuar assistindo</div>
        <h3 className="h2 mt-8" style={{ letterSpacing: '-0.02em' }}>{course.title}</h3>
        <div className="muted mt-8" style={{ fontSize: 12.5 }}>{course.instructor}</div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted mono" style={{ fontSize: 12 }}>{pct}% concluído</span>
            <span className="muted mono" style={{ fontSize: 12 }}>{stats?.lessonCount ?? 0} aulas</span>
          </div>
          <div className="progress progress-accent">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="row gap-8 mt-8">
            <Link
              href={enrollment.lastLessonId ? `/courses/${course.id}/lessons/${enrollment.lastLessonId}` : `/courses/${course.id}`}
              className="btn btn-accent"
            >
              <Icon name="play" size={14} /> Continuar
            </Link>
            <Link href={`/courses/${course.id}`} className="btn btn-ghost">Ver curso</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function XpCard({ user, xpPct, achievedCount }: { user: typeof users.$inferSelect | undefined; xpPct: number; achievedCount: number }) {
  if (!user) return null;
  const r = 52;
  const c = 2 * Math.PI * r;
  const xpToNext = Math.max(user.xp + 1220, 5500);
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="eyebrow">Seu nível</div>
        <div className="chip chip-accent"><Icon name="spark" size={11} /> Nível {user.level}</div>
      </div>
      <div className="row gap-16" style={{ marginTop: 4 }}>
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={r} stroke="var(--bg-muted)" strokeWidth="8" fill="none" />
            <circle cx="60" cy="60" r={r} stroke="var(--accent)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - c * xpPct} transform="rotate(-90 60 60)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1, letterSpacing: '-0.02em' }}>{user.level}</div>
          </div>
        </div>
        <div className="grow">
          <div className="mono" style={{ fontSize: 22, letterSpacing: '-0.01em' }}>
            {user.xp.toLocaleString('pt-BR')}
            <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}> / {xpToNext.toLocaleString('pt-BR')} XP</span>
          </div>
          <div className="muted mt-4" style={{ fontSize: 12.5 }}>Faltam {(xpToNext - user.xp).toLocaleString('pt-BR')} XP para o próximo nível</div>
          <div className="mt-12 row gap-8">
            <div className="chip"><Icon name="flame" size={11} /> {user.streak} dias</div>
            <div className="chip"><Icon name="trophy" size={11} /> {achievedCount} conquistas</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="muted"><Icon name={icon} size={16} /></div>
      <div className="mono" style={{ fontSize: 26, letterSpacing: '-0.01em' }}>{value}</div>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
    </div>
  );
}

function CourseCard({ course, progress, stats }: { course: typeof courses.$inferSelect; progress: number; stats?: CourseStats }) {
  const pct = Math.round(progress * 100);
  return (
    <Link href={`/courses/${course.id}`} className="card-flat" style={{ padding: 0, textAlign: 'left', overflow: 'hidden', display: 'block' }}>
      <div className="cover" style={{ background: course.coverBg ?? '#1e1b4b', height: 140, borderRadius: 0 }}>
        <span className="cover-glyph">{course.coverGlyph}</span>
      </div>
      <div style={{ padding: 18 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="chip">{course.level}</span>
          <span className="muted mono" style={{ fontSize: 11 }}>{stats?.lessonCount ?? 0} aulas</span>
        </div>
        <div className="h3 mt-12" style={{ letterSpacing: '-0.015em' }}>{course.title}</div>
        <div className="muted mt-4" style={{ fontSize: 12.5 }}>{course.subtitle}</div>
        <div className="mt-16">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="muted mono" style={{ fontSize: 11 }}>{pct > 0 ? `${pct}% concluído` : 'Não iniciado'}</span>
            <span className="muted mono" style={{ fontSize: 11 }}>{stats?.durationLabel ?? '—'}</span>
          </div>
          <div className="progress progress-accent">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
