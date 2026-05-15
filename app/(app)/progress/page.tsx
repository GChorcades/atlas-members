import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, userAchievements, achievements } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { Icon } from '@/components/icons';

const ACTIVITY = [3,1,0,2,4,2,1, 0,2,3,2,1,0,0, 1,2,3,1,2,2,1, 2,3,4,2,1,0,1,
                  0,1,2,3,4,3,2, 2,2,3,3,2,1,2, 3,2,4,3,2,1,1, 1,2,3,2,3,2,1,
                  2,3,3,4,2,1,0, 3,4,2,3,2,1,2, 2,3,4,3,2,1,2, 3,4,3,2,3,2,1];

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

  const userAchievs = await db
    .select({ achievement: achievements, earnedAt: userAchievements.earnedAt })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(eq(userAchievements.userId, session.user.id))
    .orderBy(desc(userAchievements.earnedAt));

  const allAchievements = await db.select().from(achievements);

  const earnedIds = new Set(userAchievs.map((a) => a.achievement.id));
  const xpToNext = Math.max((user?.xp ?? 0) + 1220, 5500);
  const xpPct = user ? user.xp / xpToNext : 0;
  const r = 58;
  const c = 2 * Math.PI * r;

  return (
    <div className="content content-wide fade-up">
      <div className="eyebrow">Sua jornada</div>
      <h1 className="h1-serif mt-8">Progresso</h1>

      {/* Stats grid */}
      <div className="progress-stats" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 20, marginTop: 28 }}>
        <div className="card" style={{ padding: 28 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="eyebrow">Nível atual</div>
            <div className="chip chip-accent"><Icon name="spark" size={11} /> Nível {user?.level ?? 1}</div>
          </div>
          <div className="row gap-24 mt-16" style={{ alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
              <svg width="132" height="132" viewBox="0 0 132 132">
                <circle cx="66" cy="66" r={r} stroke="var(--bg-muted)" strokeWidth="9" fill="none" />
                <circle cx="66" cy="66" r={r} stroke="var(--accent)" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - xpPct)} transform="rotate(-90 66 66)" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1, letterSpacing: '-0.02em' }}>{user?.level ?? 1}</div>
                  <div className="muted" style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>Nível</div>
                </div>
              </div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 26, letterSpacing: '-0.01em' }}>
                {(user?.xp ?? 0).toLocaleString('pt-BR')}
                <span className="muted" style={{ fontSize: 16 }}> / {xpToNext.toLocaleString('pt-BR')} XP</span>
              </div>
              <div className="muted mt-8" style={{ fontSize: 13 }}>
                Faltam <strong style={{ color: 'var(--text)' }}>{(xpToNext - (user?.xp ?? 0)).toLocaleString('pt-BR')} XP</strong> para o próximo nível.
              </div>
              <div className="row gap-8 mt-12">
                <div className="chip"><Icon name="flame" size={11} /> {user?.streak ?? 0} dias seguidos</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="eyebrow">XP Total</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, lineHeight: 1, letterSpacing: '-0.02em', marginTop: 12 }}>{(user?.xp ?? 0).toLocaleString('pt-BR')}</div>
          <div className="muted mt-8" style={{ fontSize: 13 }}>pontos de experiência</div>
          <div className="row gap-8 mt-16">
            <div className="chip chip-success">+10 XP por aula</div>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div className="eyebrow">Sequência</div>
          <div className="mono" style={{ fontSize: 36, marginTop: 12, letterSpacing: '-0.01em' }}>
            {user?.streak ?? 0}<span className="muted" style={{ fontSize: 18, fontWeight: 400 }}> dias</span>
          </div>
          <div className="muted mt-4" style={{ fontSize: 13 }}>dias seguidos estudando</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="card mt-24" style={{ padding: 28 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="eyebrow">Atividade</div>
            <h3 className="h2 mt-8" style={{ letterSpacing: '-0.015em' }}>Últimas 12 semanas</h3>
          </div>
          <div className="row gap-8 muted" style={{ fontSize: 11 }}>
            <span>menos</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <div key={l} className="heatmap-cell" data-level={l} style={{ width: 12, height: 12 }} />
            ))}
            <span>mais</span>
          </div>
        </div>
        <div className="heatmap mt-16">
          {Array.from({ length: 12 }).map((_, week) => (
            <div key={week} className="heatmap-col">
              {Array.from({ length: 7 }).map((_, day) => {
                const v = ACTIVITY[week * 7 + day] || 0;
                return <div key={day} className="heatmap-cell" data-level={v} />;
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="row mt-32" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
        <h2 className="h2">Conquistas</h2>
        <span className="muted mono" style={{ fontSize: 13 }}>{userAchievs.length} de {allAchievements.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {allAchievements.map((a) => {
          const earned = earnedIds.has(a.id);
          const earnedData = userAchievs.find((u) => u.achievement.id === a.id);
          return (
            <div key={a.id} className="card" style={{ padding: 20, opacity: earned ? 1 : 0.5, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, margin: '0 auto', background: earned ? 'var(--accent-soft)' : 'var(--bg-muted)', color: earned ? 'var(--accent-soft-fg)' : 'var(--text-faint)', display: 'grid', placeItems: 'center' }}>
                <Icon name={a.icon} size={22} />
              </div>
              <div className="mt-12" style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
              <div className="muted mt-4" style={{ fontSize: 11.5, lineHeight: 1.4 }}>{a.description}</div>
              {earned && earnedData && (
                <div className="mono mt-8" style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
                  {new Date(earnedData.earnedAt).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
