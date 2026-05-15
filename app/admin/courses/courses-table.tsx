'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { adminDeleteCourse, adminToggleCoursePublished } from '@/lib/actions';

type Course = {
  id: string;
  title: string;
  subtitle: string | null;
  instructor: string;
  level: string;
  lessonCount: number;
  studentCount: number;
  durationLabel: string;
  published: boolean;
  coverBg: string | null;
  coverImage: string | null;
  coverGlyph: string | null;
  createdAt: string | Date;
};

export default function CoursesTable({ courses }: { courses: Course[] }) {
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent, id: string, title: string) {
    e.stopPropagation();
    if (!confirm(`Excluir o curso "${title}"? Todas as aulas e matrículas serão removidas.`)) return;
    await adminDeleteCourse(id);
    router.refresh();
  }

  async function handleTogglePublished(e: React.MouseEvent, id: string, current: boolean) {
    e.stopPropagation();
    await adminToggleCoursePublished(id, !current);
    router.refresh();
  }

  return (
    <div className="card-flat">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Curso</th>
            <th>Instrutor</th>
            <th>Nível</th>
            <th>Aulas</th>
            <th>Duração</th>
            <th>Alunos</th>
            <th>Status</th>
            <th>Criado em</th>
            <th style={{ width: 80 }}></th>
          </tr>
        </thead>
        <tbody>
          {courses.map((course) => (
            <tr
              key={course.id}
              onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
              style={{ cursor: 'pointer' }}
            >
              <td>
                <div className="row gap-12">
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: course.coverImage ? `url(${course.coverImage}) center/cover` : (course.coverBg ?? '#1e1b4b'), display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-display)', fontSize: 14, flexShrink: 0 }}>
                    {!course.coverImage && course.coverGlyph}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{course.title}</div>
                    {course.subtitle && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{course.subtitle}</div>}
                  </div>
                </div>
              </td>
              <td className="muted">{course.instructor}</td>
              <td><span className="chip">{course.level}</span></td>
              <td className="muted mono">{course.lessonCount}</td>
              <td className="muted mono" style={{ fontSize: 12 }}>{course.durationLabel}</td>
              <td className="muted mono">{course.studentCount}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <button
                  className={`chip ${course.published ? 'chip-success' : ''}`}
                  style={{ cursor: 'pointer', border: 0, background: course.published ? undefined : 'var(--bg-muted)' }}
                  onClick={(e) => handleTogglePublished(e, course.id, course.published)}
                >
                  {course.published ? 'Publicado' : 'Rascunho'}
                </button>
              </td>
              <td className="muted mono" style={{ fontSize: 12 }}>
                {new Date(course.createdAt).toLocaleDateString('pt-BR')}
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="row gap-4" style={{ justifyContent: 'flex-end' }}>
                  <button
                    className="icon-btn"
                    title="Editar"
                    onClick={() => router.push(`/admin/courses/${course.id}/edit`)}
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Excluir"
                    style={{ color: 'var(--danger)' }}
                    onClick={(e) => handleDelete(e, course.id, course.title)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {courses.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Icon name="courses" size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 16px' }} />
          <p className="muted">Nenhum curso cadastrado.</p>
        </div>
      )}
    </div>
  );
}
