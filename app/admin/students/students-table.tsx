'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';

type Student = {
  id: string;
  name: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  streak: number;
  plan: string;
  createdAt: string | Date;
  courseCount: number;
};

const PLAN_LABEL: Record<string, string> = { free: 'Gratuito', monthly: 'Mensal', annual: 'Anual', lifetime: 'Vitalício' };

export default function StudentsTable({ students }: { students: Student[] }) {
  const router = useRouter();

  return (
    <div className="card-flat">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Nível</th>
            <th>Plano</th>
            <th>Cursos</th>
            <th>Streak</th>
            <th>Cadastrado em</th>
            <th style={{ width: 60 }}></th>
          </tr>
        </thead>
        <tbody>
          {students.map((user) => (
            <tr
              key={user.id}
              onClick={() => router.push(`/admin/students/${user.id}`)}
              style={{ cursor: 'pointer' }}
            >
              <td>
                <div className="row gap-10">
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: 12, background: user.role === 'admin' ? 'var(--accent)' : 'var(--bg-muted)', color: user.role === 'admin' ? 'var(--accent-fg)' : 'var(--text)' }}>
                    {user.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
                      {user.name}
                      {user.role === 'admin' && <span className="chip chip-accent" style={{ marginLeft: 6, fontSize: 10 }}>Admin</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 11.5 }}>{user.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <div className="row gap-6">
                  <span className="mono" style={{ fontSize: 13 }}>{user.level}</span>
                  <span className="muted mono" style={{ fontSize: 11 }}>{user.xp.toLocaleString('pt-BR')} XP</span>
                </div>
              </td>
              <td><span className="chip">{PLAN_LABEL[user.plan] ?? user.plan}</span></td>
              <td className="muted mono">{user.courseCount}</td>
              <td>
                <div className="row gap-4 muted">
                  <Icon name="flame" size={13} />
                  <span className="mono" style={{ fontSize: 13 }}>{user.streak}</span>
                </div>
              </td>
              <td className="muted mono" style={{ fontSize: 12 }}>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <button
                  className="icon-btn"
                  title="Editar aluno"
                  onClick={() => router.push(`/admin/students/${user.id}`)}
                >
                  <Icon name="edit" size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {students.length === 0 && (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Icon name="users" size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 16px' }} />
          <p className="muted">Nenhum usuário cadastrado.</p>
        </div>
      )}
    </div>
  );
}
