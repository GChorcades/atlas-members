import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, userAchievements, achievements, enrollments } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { Icon } from '@/components/icons';
import PasswordForm from './password-form';
import { getTenantId } from '@/lib/tenant';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenantId = await getTenantId();

  const [user] = await db.select().from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.id, session.user.id))).limit(1);
  if (!user) redirect('/login');

  const allAchievs = await db.select().from(achievements).where(eq(achievements.tenantId, tenantId));
  const earnedAchievs = await db
    .select({ achievement: achievements, earnedAt: userAchievements.earnedAt })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(and(eq(userAchievements.tenantId, tenantId), eq(userAchievements.userId, session.user.id)))
    .orderBy(desc(userAchievements.earnedAt));

  const enrollmentCount = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.tenantId, tenantId), eq(enrollments.userId, session.user.id)));

  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <div className="content content-wide fade-up" style={{ maxWidth: 1000 }}>
      <div className="card" style={{ padding: 36 }}>
        <div className="row gap-24" style={{ alignItems: 'flex-end' }}>
          <div className="avatar avatar-xl" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>{initials}</div>
          <div className="grow">
            <div className="eyebrow">Perfil de aluno</div>
            <h1 className="h1-serif mt-8" style={{ fontSize: 48 }}>{user.name}</h1>
            <div className="row gap-16 mt-12 muted" style={{ fontSize: 14 }}>
              <span>{user.email}</span>
              {user.location && (
                <>
                  <span className="dot" />
                  <span>{user.location}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 32, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
          {[
            { num: user.level, label: 'nível atual', sub: `${user.xp.toLocaleString('pt-BR')} XP` },
            { num: user.streak, label: 'dias seguidos', sub: 'streak ativa' },
            { num: enrollmentCount.length, label: 'cursos', sub: 'matriculados' },
            { num: `${earnedAchievs.length}/${allAchievs.length}`, label: 'conquistas', sub: `${Math.round(earnedAchievs.length / Math.max(allAchievs.length, 1) * 100)}% completo` },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.num}</div>
              <div className="muted mt-8" style={{ fontSize: 12.5 }}>{s.label}</div>
              <div className="mono mt-4" style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {earnedAchievs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, marginTop: 20 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 className="h2" style={{ letterSpacing: '-0.015em' }}>Conquistas em destaque</h3>
            <div className="mt-16" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {earnedAchievs.slice(0, 6).map(({ achievement: a, earnedAt }) => (
                <div key={a.id} className="card-muted" style={{ padding: 14, textAlign: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, margin: '0 auto', background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)', display: 'grid', placeItems: 'center' }}>
                    <Icon name={a.icon} size={16} />
                  </div>
                  <div className="mt-8" style={{ fontSize: 12, fontWeight: 600 }}>{a.title}</div>
                  <div className="mono mt-4" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                    {new Date(earnedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 className="h2" style={{ letterSpacing: '-0.015em' }}>Informações</h3>
            <div className="mt-16" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Plano', value: user.plan === 'free' ? 'Gratuito' : user.plan === 'monthly' ? 'Mensal' : user.plan === 'annual' ? 'Anual' : 'Vitalício' },
                { label: 'Membro desde', value: new Date(user.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) },
                { label: 'E-mail', value: user.email },
              ].map((it) => (
                <div key={it.label} className="row" style={{ justifyContent: 'space-between', fontSize: 13.5 }}>
                  <span className="muted">{it.label}</span>
                  <span style={{ fontWeight: 500 }}>{it.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 24, marginTop: 20 }}>
        <h3 className="h2" style={{ letterSpacing: '-0.015em' }}>Alterar senha</h3>
        <div className="muted mt-8" style={{ fontSize: 13 }}>
          Por segurança, informe sua senha atual para definir uma nova.
        </div>
        <PasswordForm />
      </div>
    </div>
  );
}
