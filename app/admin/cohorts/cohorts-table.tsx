'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { adminDeleteCohort } from '@/lib/actions';

type Cohort = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  courseCount: number;
  memberCount: number;
  createdAt: string | Date;
};

export default function CohortsTable({ cohorts }: { cohorts: Cohort[] }) {
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.stopPropagation();
    if (!confirm(`Excluir a turma "${name}"?`)) return;
    await adminDeleteCohort(id);
    router.refresh();
  }

  return (
    <div className="card-flat">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Turma</th>
            <th>Cursos</th>
            <th>Alunos</th>
            <th>Criada em</th>
            <th style={{ width: 80 }}></th>
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => (
            <tr
              key={cohort.id}
              onClick={() => router.push(`/admin/cohorts/${cohort.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <td>
                <div className="row gap-10">
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: cohort.color ?? 'var(--accent-soft)', color: 'var(--accent-soft-fg)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {cohort.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13.5 }}>{cohort.name}</div>
                    {cohort.description && (
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{cohort.description}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="muted mono">{cohort.courseCount}</td>
              <td className="muted mono">{cohort.memberCount}</td>
              <td className="muted mono" style={{ fontSize: 12 }}>
                {new Date(cohort.createdAt).toLocaleDateString('pt-BR')}
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="row gap-4" style={{ justifyContent: 'flex-end' }}>
                  <button
                    className="icon-btn"
                    title="Editar"
                    onClick={() => router.push(`/admin/cohorts/${cohort.id}`)}
                  >
                    <Icon name="edit" size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    title="Excluir"
                    style={{ color: 'var(--danger)' }}
                    onClick={(e) => handleDelete(e, cohort.id, cohort.name)}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {cohorts.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Icon name="users" size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 16px' }} />
          <p className="muted">Nenhuma turma criada. Crie sua primeira turma para agrupar alunos e cursos.</p>
        </div>
      )}
    </div>
  );
}
