'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetForm({ params, brandHeader }: { params: Promise<{ token: string }>; brandHeader: React.ReactNode }) {
  const { token } = use(params);
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação não confere');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao redefinir');
      } else {
        setDone(true);
        setTimeout(() => router.push('/login'), 2500);
      }
    } catch {
      setError('Erro de rede');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-up">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {brandHeader}
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', margin: 0 }}>
            Definir nova senha
          </h1>
          <p className="muted mt-8" style={{ fontSize: 14 }}>Escolha uma nova senha para sua conta.</p>
        </div>

        {done ? (
          <>
            <div style={{ padding: '14px 16px', borderRadius: 9, background: '#dcfce7', border: '1px solid #22c55e', fontSize: 13.5, color: '#166534', marginBottom: 16 }}>
              Senha redefinida com sucesso. Redirecionando para o login…
            </div>
          </>
        ) : (
          <>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field-group">
                <label className="field-label" htmlFor="newPassword">Nova senha (mín. 6 caracteres)</label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="confirmPassword">Confirmar senha</label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-accent btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              >
                {loading ? 'Salvando…' : 'Redefinir senha'}
              </button>
            </form>

            <p className="muted mt-24" style={{ textAlign: 'center', fontSize: 13 }}>
              <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                Voltar para o login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
