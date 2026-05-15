'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterForm({ brandHeader }: { brandHeader: React.ReactNode }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        name: fd.get('name'),
        email: fd.get('email'),
        password: fd.get('password'),
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Erro ao criar conta.');
    } else {
      router.push('/login?registered=1');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card fade-up">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          {brandHeader}
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', margin: 0 }}>
            Criar conta
          </h1>
          <p className="muted mt-8" style={{ fontSize: 14 }}>Comece sua jornada de aprendizado</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="name">Nome completo</label>
            <input id="name" name="name" type="text" required className="input-field" placeholder="Seu nome" />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required className="input-field" placeholder="voce@exemplo.com" />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" required minLength={8} className="input-field" placeholder="Mínimo 8 caracteres" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-accent btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
          >
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="muted mt-24" style={{ textAlign: 'center', fontSize: 13 }}>
          Já tem conta?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
