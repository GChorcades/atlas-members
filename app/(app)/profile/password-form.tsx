'use client';

import { useState } from 'react';

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 6) {
      setMsg({ type: 'err', text: 'A nova senha deve ter no mínimo 6 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'err', text: 'A confirmação não confere' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: 'err', text: data.error ?? 'Erro ao alterar senha' });
      } else {
        setMsg({ type: 'ok', text: 'Senha alterada com sucesso' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setMsg({ type: 'err', text: 'Erro de rede' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16, maxWidth: 420 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
        <span className="muted">Senha atual</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
        <span className="muted">Nova senha (mínimo 6 caracteres)</span>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
        <span className="muted">Confirmar nova senha</span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
        />
      </label>
      {msg && (
        <div style={{ fontSize: 13, color: msg.type === 'ok' ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)' }}>
          {msg.text}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: 'var(--accent)',
          color: 'var(--accent-fg)',
          border: 'none',
          fontWeight: 600,
          fontSize: 14,
          cursor: loading ? 'wait' : 'pointer',
          alignSelf: 'flex-start',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Alterando…' : 'Alterar senha'}
      </button>
    </form>
  );
}
