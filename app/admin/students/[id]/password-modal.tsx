'use client';

import { useState } from 'react';

type Props = {
  userId: string;
  userName: string;
  onClose: () => void;
};

export default function PasswordModal({ userId, userName, onClose }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não confere');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/students/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao redefinir senha');
        setSubmitting(false);
      } else {
        setSuccess(true);
        setSubmitting(false);
      }
    } catch {
      setError('Erro de rede');
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'grid', placeItems: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 460, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Redefinir senha</h3>
          <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
            Definir nova senha para <strong>{userName}</strong>. Comunique a senha ao aluno por um canal seguro.
          </p>
        </div>

        <div style={{ padding: 20 }}>
          {success ? (
            <>
              <div style={{ padding: '10px 14px', borderRadius: 9, background: '#dcfce7', border: '1px solid #22c55e', fontSize: 12.5, color: '#166534', marginBottom: 16 }}>
                Senha redefinida com sucesso.
              </div>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-accent" onClick={onClose}>Fechar</button>
              </div>
            </>
          ) : (
            <>
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 9, background: '#fee2e2', border: '1px solid #ef4444', fontSize: 12.5, color: '#991b1b', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <div className="field-group" style={{ marginBottom: 14 }}>
                <label className="field-label">Nova senha (mín. 6 caracteres)</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
                />
              </div>

              <div className="field-group" style={{ marginBottom: 16 }}>
                <label className="field-label">Confirmar senha</label>
                <input
                  type="text"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 14 }}
                />
              </div>

              <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancelar</button>
                <button className="btn btn-accent" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Salvando…' : 'Redefinir senha'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
