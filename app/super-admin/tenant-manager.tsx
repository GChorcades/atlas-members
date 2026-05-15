'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createTenant,
  updateTenant,
  toggleTenantActive,
  superAdminLogout,
} from '@/lib/super-admin-actions';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  active: boolean;
  createdAt: string;
  userCount: number;
  courseCount: number;
};

function tenantUrl(t: Tenant, platformDomain: string): string {
  if (t.customDomain) return `https://${t.customDomain}`;
  if (platformDomain) return `https://${t.slug}.${platformDomain}`;
  return '';
}

export default function TenantManager({
  adminName,
  tenants,
  platformDomain,
}: {
  adminName: string;
  tenants: Tenant[];
  platformDomain: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const activeCount = tenants.filter((t) => t.active).length;

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') ?? ''),
      slug: String(fd.get('slug') ?? ''),
      customDomain: String(fd.get('customDomain') ?? ''),
      adminName: String(fd.get('adminName') ?? ''),
      adminEmail: String(fd.get('adminEmail') ?? ''),
      adminPassword: String(fd.get('adminPassword') ?? ''),
    };
    startTransition(async () => {
      const res = await createTenant(payload);
      if (res.ok) {
        setShowCreate(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleUpdate(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') ?? ''),
      slug: String(fd.get('slug') ?? ''),
      customDomain: String(fd.get('customDomain') ?? ''),
    };
    startTransition(async () => {
      const res = await updateTenant(id, payload);
      if (res.ok) {
        setEditingId(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleToggle(id: string, active: boolean) {
    setError('');
    startTransition(async () => {
      await toggleTenantActive(id, active);
      router.refresh();
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #0f0f12)' }}>
      {/* Top bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface, rgba(0,0,0,0.2))',
        }}
      >
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Super Admin</div>
            <div className="muted" style={{ fontSize: 11 }}>Gestão da plataforma</div>
          </div>
        </div>
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 13 }}>{adminName}</span>
          <form action={superAdminLogout}>
            <button type="submit" className="btn btn-ghost btn-sm">Sair</button>
          </form>
        </div>
      </header>

      <div className="content" style={{ maxWidth: 980, margin: '0 auto', padding: '32px 28px' }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
          <div>
            <h2 className="h2">Tenants</h2>
            <p className="muted mt-4" style={{ fontSize: 13 }}>
              {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} · {activeCount} ativo{activeCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            className="btn btn-accent"
            onClick={() => { setShowCreate((v) => !v); setError(''); }}
          >
            {showCreate ? 'Cancelar' : '+ Novo tenant'}
          </button>
        </div>

        {!platformDomain && (
          <div
            className="muted"
            style={{
              fontSize: 12,
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              marginBottom: 20,
              lineHeight: 1.5,
            }}
          >
            A variável <code>PLATFORM_DOMAIN</code> não está definida — os tenants ainda não
            têm URL de subdomínio resolvível. Defina-a para ativar o roteamento por subdomínio.
          </div>
        )}

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="card" style={{ padding: 24, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Nova área de membros</div>

            <div className="row" style={{ gap: 12 }}>
              <label className="field-group" style={{ flex: 1 }}>
                <span className="field-label">Nome do tenant</span>
                <input className="input-field" name="name" required placeholder="Ex.: Escola da Maria" />
              </label>
              <label className="field-group" style={{ flex: 1 }}>
                <span className="field-label">Subdomínio</span>
                <input className="input-field" name="slug" required placeholder="escola-da-maria" />
              </label>
            </div>
            <label className="field-group">
              <span className="field-label">Domínio próprio (opcional)</span>
              <input className="input-field" name="customDomain" placeholder="cursos.dominioproprio.com.br" />
            </label>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 2 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Administrador do tenant</div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
                Cria a primeira conta de admin desta área de membros.
              </p>
              <div className="row" style={{ gap: 12 }}>
                <label className="field-group" style={{ flex: 1 }}>
                  <span className="field-label">Nome</span>
                  <input className="input-field" name="adminName" required placeholder="Maria Silva" />
                </label>
                <label className="field-group" style={{ flex: 1 }}>
                  <span className="field-label">E-mail</span>
                  <input className="input-field" name="adminEmail" type="email" required placeholder="maria@exemplo.com" />
                </label>
              </div>
              <label className="field-group" style={{ marginTop: 12 }}>
                <span className="field-label">Senha (mín. 8 caracteres)</span>
                <input className="input-field" name="adminPassword" type="password" required minLength={8} placeholder="••••••••" />
              </label>
            </div>

            <button type="submit" disabled={pending} className="btn btn-accent" style={{ alignSelf: 'flex-start' }}>
              {pending ? 'Criando…' : 'Criar tenant'}
            </button>
          </form>
        )}

        {/* Tenant list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tenants.length === 0 && (
            <div className="muted" style={{ fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              Nenhum tenant ainda. Crie o primeiro acima.
            </div>
          )}

          {tenants.map((t) => {
            const url = tenantUrl(t, platformDomain);
            const isEditing = editingId === t.id;
            return (
              <div key={t.id} className="card" style={{ padding: 20 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          background: t.active
                            ? 'color-mix(in oklab, #16a34a 18%, transparent)'
                            : 'color-mix(in oklab, #dc2626 16%, transparent)',
                          color: t.active ? '#16a34a' : '#dc2626',
                        }}
                      >
                        {t.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                      {url ? (
                        <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                          {url.replace('https://', '')}
                        </a>
                      ) : (
                        <span>subdomínio: <strong>{t.slug}</strong></span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      {t.userCount} usuário{t.userCount !== 1 ? 's' : ''} · {t.courseCount} curso{t.courseCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setEditingId(isEditing ? null : t.id); setError(''); }}
                    >
                      {isEditing ? 'Fechar' : 'Editar'}
                    </button>
                    <button
                      className="btn btn-soft btn-sm"
                      disabled={pending}
                      onClick={() => handleToggle(t.id, !t.active)}
                    >
                      {t.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <form
                    onSubmit={(e) => handleUpdate(t.id, e)}
                    style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}
                  >
                    <div className="row" style={{ gap: 12 }}>
                      <label className="field-group" style={{ flex: 1 }}>
                        <span className="field-label">Nome</span>
                        <input className="input-field" name="name" required defaultValue={t.name} />
                      </label>
                      <label className="field-group" style={{ flex: 1 }}>
                        <span className="field-label">Subdomínio</span>
                        <input className="input-field" name="slug" required defaultValue={t.slug} />
                      </label>
                    </div>
                    <label className="field-group">
                      <span className="field-label">Domínio próprio (opcional)</span>
                      <input className="input-field" name="customDomain" defaultValue={t.customDomain ?? ''} placeholder="cursos.dominioproprio.com.br" />
                    </label>
                    <button type="submit" disabled={pending} className="btn btn-accent btn-sm" style={{ alignSelf: 'flex-start' }}>
                      {pending ? 'Salvando…' : 'Salvar alterações'}
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
