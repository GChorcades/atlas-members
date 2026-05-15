'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotForm({ brandHeader }: { brandHeader: React.ReactNode }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Erro ao enviar');
      } else {
        setSent(true);
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
            Recuperar acesso
          </h1>
          <p className="muted mt-8" style={{ fontSize: 14 }}>
            Enviaremos um link de redefinição para seu email e WhatsApp.
          </p>
        </div>

        {sent ? (
          <>
            <div style={{ padding: '14px 16px', borderRadius: 9, background: '#dcfce7', border: '1px solid #22c55e', fontSize: 13.5, color: '#166534', marginBottom: 16 }}>
              Se este email estiver cadastrado, você receberá em instantes um link para redefinir sua senha. O link expira em 1 hora.
            </div>
            <Link href="/login" className="btn btn-ghost btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              Voltar para o login
            </Link>
          </>
        ) : (
          <>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field-group">
                <label className="field-label" htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="input-field"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-accent btn-lg"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              >
                {loading ? 'Enviando…' : 'Enviar link'}
              </button>
            </form>

            <p className="muted mt-24" style={{ textAlign: 'center', fontSize: 13 }}>
              Lembrou da senha?{' '}
              <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                Voltar ao login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
