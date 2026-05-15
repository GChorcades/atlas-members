'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError('E-mail ou senha inválidos.');
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-up">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <span className="sidebar-brand-mark">A</span>
            <span style={{ fontWeight: 600, fontSize: 17 }}>Atlas</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', margin: 0 }}>
            Bem-vindo de volta
          </h1>
          <p className="muted mt-8" style={{ fontSize: 14 }}>Entre com seu e-mail e senha</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input-field"
              placeholder="voce@exemplo.com"
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="input-field"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-accent btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="muted mt-24" style={{ textAlign: 'center', fontSize: 13 }}>
          Não tem conta?{' '}
          <Link href="/register" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
