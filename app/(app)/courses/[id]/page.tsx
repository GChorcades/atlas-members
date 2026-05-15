'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { enrollInCourse } from '@/lib/actions';
import { Skel, SkelText } from '@/components/skeleton';

type Lesson = {
  id: string;
  title: string;
  type: string;
  position: number;
  duration: string | null;
  done: boolean;
  current: boolean;
};

type Module = {
  id: string;
  title: string;
  position: number;
  duration: string | null;
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  instructor: string;
  instructorRole: string | null;
  level: string;
  duration: string | null;
  lessonCount: number;
  moduleCount: number;
  rating: number;
  students: number;
  coverBg: string | null;
  coverImage: string | null;
  coverGlyph: string | null;
  coverAccent: string | null;
  tags: string[];
  modules: Module[];
  progress: number;
  lastLessonId: string | null;
  enrolled: boolean;
};

export default function CoursePage() {
  const params = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [tab, setTab] = useState('content');
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setCourse(data);
        const curMod = data.modules.find((m: Module) => m.lessons.some((l: Lesson) => l.current));
        setOpenModules(new Set([curMod?.id ?? data.modules[0]?.id]));
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return (
      <div className="content content-wide" style={{ maxWidth: 1100, padding: '24px 32px' }}>
        <Skel h={220} radius={14} style={{ marginBottom: 24 }} />
        <div className="course-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skel h={22} w={200} style={{ marginBottom: 4 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skel key={i} h={56} />
            ))}
          </div>
          <div className="card" style={{ padding: 20 }}>
            <SkelText lines={4} />
            <Skel h={44} radius={10} style={{ marginTop: 16 }} />
          </div>
        </div>
      </div>
    );
  }
  if (!course) return <div className="content"><p className="muted">Curso não encontrado.</p></div>;

  const totalLessons = course.modules.reduce((a, m) => a + m.lessons.length, 0) || course.lessonCount;
  const doneLessons = course.modules.reduce((a, m) => a + m.lessons.filter((l) => l.done).length, 0);
  const pct = Math.round(course.progress * 100);

  const toggleModule = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="content content-wide fade-up">
      {/* Breadcrumbs */}
      <div className="row gap-8" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        <Link href="/dashboard" style={{ color: 'inherit' }}>Início</Link>
        <Icon name="chevron-right" size={14} style={{ opacity: 0.5 }} />
        <Link href="/catalog" style={{ color: 'inherit' }}>Meus cursos</Link>
        <Icon name="chevron-right" size={14} style={{ opacity: 0.5 }} />
        <span style={{ color: 'var(--text)' }}>{course.title}</span>
      </div>

      {/* Hero */}
      <div style={{ marginTop: 20, position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: course.coverImage ? `url(${course.coverImage}) center/cover, ${course.coverBg ?? '#1e1b4b'}` : (course.coverBg ?? '#1e1b4b'), color: 'rgba(255,255,255,0.95)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(80% 60% at 0% 100%, rgba(255,255,255,0.18), transparent 60%), repeating-linear-gradient(135deg, transparent 0 18px, rgba(255,255,255,0.04) 18px 19px)' }} />
        <div className="course-hero-grid" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40, padding: '36px 40px' }}>
          <div>
            <div className="row gap-8" style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>
              <span>Curso · {course.level}</span>
              <span className="dot" style={{ background: 'currentColor' }} />
              <span>{course.moduleCount} módulos · {course.lessonCount} aulas</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 56, letterSpacing: '-0.025em', lineHeight: 1.02, marginTop: 16, marginBottom: 0 }}>
              {course.title}
            </h1>
            <p style={{ marginTop: 16, marginBottom: 0, fontSize: 16, lineHeight: 1.5, opacity: 0.85, maxWidth: 560 }}>{course.description}</p>
            <div className="row gap-16" style={{ marginTop: 28 }}>
              <div className="row gap-12">
                <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', fontWeight: 500, fontSize: 14 }}>
                  {course.instructor.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{course.instructor}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{course.instructorRole}</div>
                </div>
              </div>
              <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.18)' }} />
              <div className="row gap-8" style={{ fontSize: 13 }}>
                <Icon name="star" size={14} style={{ color: '#fcd34d' }} />
                <span style={{ fontWeight: 500 }}>{course.rating}</span>
                <span className="course-students-count" style={{ opacity: 0.6 }}>({course.students.toLocaleString('pt-BR')} alunos)</span>
              </div>
            </div>
          </div>

          {/* Progress card */}
          <div style={{ alignSelf: 'center', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 14, padding: 22 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 }}>Seu progresso</div>
            <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 56, letterSpacing: '-0.02em', lineHeight: 1 }}>
                {pct}<span style={{ fontSize: 28, opacity: 0.7 }}>%</span>
              </span>
            </div>
            <div style={{ marginTop: 10, opacity: 0.8, fontSize: 13 }}>{doneLessons} de {totalLessons} aulas concluídas</div>
            <div style={{ marginTop: 14, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: course.coverAccent ?? 'white', borderRadius: 999 }} />
            </div>
            {course.enrolled ? (
              <Link
                href={course.lastLessonId ? `/courses/${course.id}/lessons/${course.lastLessonId}` : `/courses/${course.id}`}
                className="btn btn-lg"
                style={{ marginTop: 22, width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.96)', color: '#18181b' }}
              >
                <Icon name="play" size={14} /> {pct > 0 ? 'Continuar de onde parei' : 'Começar curso'}
              </Link>
            ) : (
              <form action={enrollInCourse.bind(null, course.id)} style={{ marginTop: 22 }}>
                <button className="btn btn-lg" style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.96)', color: '#18181b' }}>
                  <Icon name="plus" size={14} /> Matricular-se
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Tabs + layout */}
      <div className="course-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40, marginTop: 36 }}>
        <div>
          <div className="tabs">
            {[
              { id: 'content', label: 'Conteúdo' },
              { id: 'about', label: 'Sobre o curso' },
            ].map((t) => (
              <button key={t.id} className="tab" data-active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {tab === 'content' && (
            <div>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
                <div className="muted" style={{ fontSize: 13 }}>{course.moduleCount} módulos · {course.lessonCount} aulas · {course.duration}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setOpenModules(new Set(course.modules.map((m) => m.id)))}>Expandir todos</button>
              </div>
              {course.modules.map((mod, i) => (
                <ModuleAccordion key={mod.id} mod={mod} index={i + 1} open={openModules.has(mod.id)} onToggle={() => toggleModule(mod.id)} courseId={course.id} />
              ))}
            </div>
          )}

          {tab === 'about' && (
            <div className="col gap-24" style={{ maxWidth: 720 }}>
              <div>
                <h3 className="h2" style={{ letterSpacing: '-0.015em' }}>O que você vai aprender</h3>
                <p className="muted mt-12" style={{ lineHeight: 1.6, fontSize: 14 }}>{course.description}</p>
              </div>
            </div>
          )}
        </div>

        <aside className="course-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80, alignSelf: 'flex-start' }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow">Instrutor</div>
            <div className="row gap-12 mt-12">
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: course.coverBg ?? '#1e1b4b', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.95)', fontWeight: 500, fontSize: 16, flexShrink: 0 }}>
                {course.instructor.split(' ').map((p) => p[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{course.instructor}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{course.instructorRole}</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <div className="eyebrow">Este curso inclui</div>
            <div className="mt-12" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: 'play-circle', label: `${course.lessonCount} aulas em vídeo` },
                { icon: 'chat', label: 'Comentários moderados' },
                { icon: 'certificate', label: 'Certificado ao concluir' },
              ].map((it) => (
                <div key={it.label} className="row gap-12" style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}><Icon name={it.icon} size={15} /></span>
                  <span>{it.label}</span>
                </div>
              ))}
            </div>
          </div>
          {course.tags.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div className="eyebrow">Tópicos</div>
              <div className="row gap-8 mt-12" style={{ flexWrap: 'wrap' }}>
                {course.tags.map((t) => <span key={t} className="chip">{t}</span>)}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ModuleAccordion({ mod, index, open, onToggle, courseId }: { mod: Module; index: number; open: boolean; onToggle: () => void; courseId: string }) {
  const done = mod.lessons.filter((l) => l.done).length;
  return (
    <div className="module">
      <button className="module-head" onClick={onToggle}>
        <span className="module-num mono">{String(index).padStart(2, '0')}</span>
        <div className="module-title-wrap">
          <div className="row gap-8">
            <span className="module-title">{mod.title}</span>
            {mod.lessons.some((l) => l.current) && <span className="module-current-pill">EM CURSO</span>}
          </div>
          <div className="module-sub mono">{mod.lessons.length} aulas · {mod.duration}{done > 0 && ` · ${done}/${mod.lessons.length} concluídas`}</div>
        </div>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} style={{ color: 'var(--text-faint)' }} />
      </button>
      {open && (
        <div>
          {mod.lessons.map((l) => (
            <Link
              key={l.id}
              href={`/courses/${courseId}/lessons/${l.id}`}
              className="lesson-row"
              data-current={l.current}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <div className="lesson-icon" data-done={l.done} data-current={l.current}>
                {l.done ? <Icon name="check" size={14} /> : l.type === 'quiz' ? <Icon name="brain" size={13} /> : <Icon name="play" size={11} />}
              </div>
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: l.current ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title}</div>
              </div>
              <div className="lesson-meta">
                <span>{l.duration}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
