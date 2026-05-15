'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  updateSuperAdminProfile,
  updateSuperAdminPassword,
  superAdminLogout,
} from '@/lib/super-admin-actions';

export default function AccountForm({
  admin,
}: {
  admin: { id: string; name: string; email: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [profileMsg, setProfileMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  function handleProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileMsg(null);
    const fd = new FormData(e.currentTarget);
    const payload = { name: String(fd.get('name') ?? ''), email: String(fd.get('email') ?? '') };
    startTransition(async () => {
      const res = await updateSuperAdminProfile(payload);
      if (res.ok) {
        setProfileMsg({ kind: 'ok', text: 'Dados salvos.' });
        router.refresh();
      } else {
        setProfileMsg({ kind: 'err', text: res.error });
      }
    });
  }

  function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMsg(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      currentPassword: String(fd.get('currentPassword') ?? ''),
      newPassword: String(fd.get('newPassword') ?? ''),
    };
    startTransition(async () => {
      const res = await updateSuperAdminPassword(payload);
      if (res.ok) {
        setPasswordMsg({ kind: 'ok', text: 'Senha alterada com sucesso.' });
        form.reset();
      } else {
        setPasswordMsg({ kind: 'err', text: res.error });
      }
    });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #0f0f12)' }}>
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
            <div className="muted" style={{ fontSize: 11 }}>Minha conta</div>
          </div>
        </div>
        <div className="row" style={{ gap: 14, alignItems: 'center' }}>
          <Link href="/super-admin" className="btn btn-ghost btn-sm">Tenants</Link>
          <form action={superAdminLogout}>
            <button type="submit" className="btn btn-ghost btn-sm">Sair</button>
          </form>
        </div>
      </header>

      <div className="content" style={{ maxWidth: 620, margin: '0 auto', padding: '32px 28px' }}>
        <h2 className="h2" style={{ marginBottom: 24 }}>Minha conta</h2>

        {/* Dados */}
        <form onSubmit={handleProfile} className="card" style={{ padding: 24, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Dados do administrador</div>

          <label className="field-group">
            <span className="field-label">Nome</span>
            <input className="input-field" name="name" required defaultValue={admin.name} />
          </label>
          <label className="field-group">
            <span className="field-label">E-mail (login)</span>
            <input className="input-field" name="email" type="email" required defaultValue={admin.email} />
          </label>

          {profileMsg && (
            <div className={profileMsg.kind === 'err' ? 'auth-error' : undefined}
              style={profileMsg.kind === 'ok' ? { fontSize: 13, color: '#16a34a' } : undefined}>
              {profileMsg.text}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn btn-accent" style={{ alignSelf: 'flex-start' }}>
            {pending ? 'Salvando…' : 'Salvar dados'}
          </button>
        </form>

        {/* Senha */}
        <form onSubmit={handlePassword} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Alterar senha</div>

          <label className="field-group">
            <span className="field-label">Senha atual</span>
            <input className="input-field" name="currentPassword" type="password" required autoComplete="current-password" />
          </label>
          <label className="field-group">
            <span className="field-label">Nova senha (mín. 8 caracteres)</span>
            <input className="input-field" name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
          </label>

          {passwordMsg && (
            <div className={passwordMsg.kind === 'err' ? 'auth-error' : undefined}
              style={passwordMsg.kind === 'ok' ? { fontSize: 13, color: '#16a34a' } : undefined}>
              {passwordMsg.text}
            </div>
          )}

          <button type="submit" disabled={pending} className="btn btn-accent" style={{ alignSelf: 'flex-start' }}>
            {pending ? 'Salvando…' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
