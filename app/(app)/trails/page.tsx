import { db } from '@/db';
import { trails, trailCourses, courses } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import Link from 'next/link';
import { Icon } from '@/components/icons';

export default async function TrailsPage() {
  const allTrails = await db.select().from(trails).orderBy(asc(trails.position));

  const trailsWithCourses = await Promise.all(
    allTrails.map(async (trail) => {
      const rows = await db
        .select({ course: courses })
        .from(trailCourses)
        .innerJoin(courses, eq(trailCourses.courseId, courses.id))
        .where(eq(trailCourses.trailId, trail.id))
        .orderBy(asc(trailCourses.position));
      return { ...trail, courses: rows.map((r) => r.course) };
    }),
  );

  return (
    <div className="content content-wide fade-up">
      <div className="eyebrow">Aprendizado guiado</div>
      <h1 className="h1-serif mt-8">Trilhas</h1>
      <p className="muted mt-8" style={{ fontSize: 15, maxWidth: 600 }}>
        Sequências cuidadosamente ordenadas de cursos. Cada trilha leva você de um ponto A claro a um ponto B mensurável.
      </p>

      {trailsWithCourses.length === 0 ? (
        <div className="card mt-32" style={{ padding: 48, textAlign: 'center' }}>
          <Icon name="trail" size={40} style={{ color: 'var(--text-faint)', margin: '0 auto 16px' }} />
          <h3 className="h3" style={{ marginBottom: 8 }}>Nenhuma trilha disponível</h3>
          <p className="muted" style={{ fontSize: 14 }}>Em breve novas trilhas serão adicionadas.</p>
        </div>
      ) : (
        <div className="col gap-16 mt-32" style={{ maxWidth: 880 }}>
          {trailsWithCourses.map((trail, i) => (
            <div key={trail.id} className="card" style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
              <div>
                <div className="row gap-8">
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: trail.color ?? 'var(--accent)', color: 'white', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '-0.02em' }}>
                    {String(i + 1)}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>Trilha · {trail.courses.length} cursos</span>
                </div>
                <h3 className="h2 mt-12">{trail.title}</h3>
                <div className="row gap-8 mt-16" style={{ flexWrap: 'wrap' }}>
                  {trail.courses.map((c) => (
                    <div key={c.id} className="row gap-8 chip" style={{ background: 'var(--bg-muted)' }}>
                      <span style={{ width: 16, height: 16, borderRadius: 4, background: c.coverBg ?? '#1e1b4b', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.95)', fontSize: 9, fontFamily: 'var(--font-display)' }}>
                        {c.coverGlyph}
                      </span>
                      <span>{c.title}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 28, letterSpacing: '-0.01em' }}>{trail.courses.length}</div>
                <div className="muted" style={{ fontSize: 12 }}>cursos</div>
                <Link href="/catalog" className="btn btn-soft mt-16">
                  Ver cursos <Icon name="arrow-right" size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
