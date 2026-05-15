import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { courses, enrollments, checkouts } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { getCourseStats } from '@/lib/course-stats';
import { getTenantId } from '@/lib/tenant';

export default async function CatalogPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenantId = await getTenantId();

  const allCourses = await db.select().from(courses)
    .where(and(eq(courses.tenantId, tenantId), eq(courses.published, true)))
    .orderBy(desc(courses.createdAt));

  const userEnrollments = await db
    .select({ courseId: enrollments.courseId, progress: enrollments.progress })
    .from(enrollments)
    .where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.userId, session.user.id)));

  const enrolledMap = new Map(userEnrollments.map((e) => [e.courseId, e.progress]));

  const activeCheckouts = await db
    .select({ courseId: checkouts.courseId, slug: checkouts.slug })
    .from(checkouts)
    .where(and(eq(checkouts.tenantId, tenantId), eq(checkouts.active, true)));
  const checkoutMap = new Map(activeCheckouts.map((c) => [c.courseId, c.slug]));

  const myCourses = allCourses.filter((c) => enrolledMap.has(c.id));
  const lockedCourses = allCourses.filter((c) => !enrolledMap.has(c.id));

  const statsMap = await getCourseStats(allCourses.map((c) => c.id));

  return (
    <div className="content content-wide fade-up">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div className="eyebrow">Catálogo</div>
          <h1 className="h1-serif mt-8">Meus cursos</h1>
        </div>
        <div className="row gap-8 muted" style={{ fontSize: 13 }}>
          <span>{myCourses.length} curso{myCourses.length !== 1 ? 's' : ''} liberado{myCourses.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {myCourses.length === 0 ? (
        <div className="card mt-32" style={{ padding: 48, textAlign: 'center' }}>
          <Icon name="courses" size={40} style={{ color: 'var(--text-faint)', margin: '0 auto 16px' }} />
          <h3 className="h3" style={{ marginBottom: 8 }}>Você ainda não tem cursos liberados</h3>
          <p className="muted" style={{ fontSize: 14 }}>Confira abaixo os cursos disponíveis.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 32 }}>
          {myCourses.map((course) => {
            const progress = enrolledMap.get(course.id);
            const pct = Math.round((progress ?? 0) * 100);
            const stats = statsMap.get(course.id);
            return (
              <div key={course.id} className="card-flat" style={{ padding: 0, overflow: 'hidden' }}>
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
                  <div className="muted mt-8" style={{ fontSize: 12 }}>{course.instructor}</div>
                  <div className="mt-16">
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                      <span className="muted mono" style={{ fontSize: 11 }}>{pct > 0 ? `${pct}%` : 'Não iniciado'}</span>
                      <span className="muted mono" style={{ fontSize: 11 }}>{stats?.durationLabel ?? '—'}</span>
                    </div>
                    <div className="progress progress-accent">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="row gap-8 mt-16">
                    <Link href={`/courses/${course.id}`} className="btn btn-soft btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                      Continuar curso
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lockedCourses.length > 0 && (
        <>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 56 }}>
            <div>
              <div className="eyebrow">Disponíveis</div>
              <h2 className="h2 mt-8">Outros cursos</h2>
              <p className="muted mt-4" style={{ fontSize: 13 }}>Cursos que você ainda não tem acesso</p>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {lockedCourses.length} curso{lockedCourses.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
            {lockedCourses.map((course) => {
              const checkoutSlug = checkoutMap.get(course.id);
              const stats = statsMap.get(course.id);
              const cta = checkoutSlug
                ? { href: `/checkout/${checkoutSlug}`, label: 'Comprar acesso' }
                : { href: `/courses/${course.id}`, label: 'Ver detalhes' };
              return (
                <div
                  key={course.id}
                  className="card-flat"
                  style={{ padding: 0, overflow: 'hidden', opacity: 0.92 }}
                >
                  <div
                    className="cover"
                    style={{
                      background: course.coverBg ?? '#1e1b4b',
                      height: 100,
                      borderRadius: 0,
                      position: 'relative',
                      filter: 'grayscale(0.4)',
                    }}
                  >
                    <span className="cover-glyph" style={{ opacity: 0.55, fontSize: 28 }}>{course.coverGlyph}</span>
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.18)',
                          backdropFilter: 'blur(4px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                        }}
                      >
                        <LockIcon />
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="chip" style={{ fontSize: 10 }}>{course.level}</span>
                      <span className="muted mono" style={{ fontSize: 10 }}>{stats?.lessonCount ?? 0} aulas</span>
                    </div>
                    <div className="mt-8" style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                      {course.title}
                    </div>
                    <div className="muted mt-4" style={{ fontSize: 11.5 }}>{course.instructor}</div>
                    <Link
                      href={cta.href}
                      className="btn btn-soft btn-sm mt-12"
                      style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                    >
                      {cta.label}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
