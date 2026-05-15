import { db } from '@/db';
import { comments, users, lessons, modules, courses } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Icon } from '@/components/icons';
import { adminModerateComment } from '@/lib/actions';

export default async function AdminCommentsPage() {
  const rows = await db
    .select({ comment: comments, user: users, lesson: lessons })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .innerJoin(lessons, eq(comments.lessonId, lessons.id))
    .orderBy(desc(comments.createdAt))
    .limit(100);

  const pending = rows.filter((r) => r.comment.status === 'pending');
  const approved = rows.filter((r) => r.comment.status === 'approved');
  const rejected = rows.filter((r) => r.comment.status === 'rejected');

  const statusColor = { pending: 'var(--warning)', approved: 'var(--success)', rejected: 'var(--danger)' };
  const statusLabel = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' };

  return (
    <div>
      <div className="row" style={{ gap: 20, marginBottom: 24, alignItems: 'flex-end' }}>
        <div>
          <h2 className="h2">Comentários</h2>
          <p className="muted mt-4" style={{ fontSize: 13 }}>{pending.length} pendentes · {approved.length} aprovados · {rejected.length} rejeitados</p>
        </div>
      </div>

      <div className="card-flat">
        {rows.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Icon name="chat" size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 16px' }} />
            <p className="muted">Nenhum comentário.</p>
          </div>
        )}
        {rows.map(({ comment, user, lesson }) => (
          <div key={comment.id} style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <div className="row gap-8" style={{ marginBottom: 8 }}>
                <div className="avatar" style={{ width: 28, height: 28, fontSize: 11, background: 'var(--bg-muted)', color: 'var(--text)' }}>{user.name[0]}</div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{user.name}</span>
                <span className="muted" style={{ fontSize: 12 }}>em "{lesson.title}"</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-faint)' }}>{new Date(comment.createdAt).toLocaleDateString('pt-BR')}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: statusColor[comment.status as keyof typeof statusColor] }}>
                  {statusLabel[comment.status as keyof typeof statusLabel]}
                </span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.55, margin: 0, color: 'var(--text)' }}>{comment.text}</p>
            </div>
            <div className="row gap-6">
              {comment.status !== 'approved' && (
                <form action={adminModerateComment.bind(null, comment.id, 'approved')}>
                  <button type="submit" className="btn btn-soft btn-sm" style={{ color: 'var(--success)' }}>
                    <Icon name="check" size={13} /> Aprovar
                  </button>
                </form>
              )}
              {comment.status !== 'rejected' && (
                <form action={adminModerateComment.bind(null, comment.id, 'rejected')}>
                  <button type="submit" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>
                    <Icon name="x" size={13} /> Rejeitar
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
