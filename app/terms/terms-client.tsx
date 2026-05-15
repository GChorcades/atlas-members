'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { MarkdownRenderer } from '@/components/markdown-renderer';

export default function TermsClient({ userName, termsText }: { userName: string; termsText: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    if (!checked) return;
    setAccepting(true);
    setError('');
    try {
      const res = await fetch('/api/terms/accept', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Erro ao registrar aceite');
        setAccepting(false);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Erro de rede');
      setAccepting(false);
    }
  }

  async function handleDecline() {
    await signOut({ callbackUrl: '/login' });
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 16px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div className="card" style={{ padding: 40 }}>
          <div className="eyebrow">Aceite obrigatório</div>
          <h1 className="h1-serif mt-8" style={{ fontSize: 36 }}>
            Termos de uso e proteção de propriedade intelectual
          </h1>
          <p className="muted mt-12" style={{ fontSize: 14 }}>
            Olá, <strong>{userName}</strong>. Antes de acessar o conteúdo, leia atentamente e aceite os termos abaixo.
          </p>

          <div
            className="prose-content"
            style={{
              marginTop: 24,
              padding: 20,
              borderRadius: 10,
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              maxHeight: 480,
              overflowY: 'auto',
              fontSize: 14,
              lineHeight: 1.65,
            }}
          >
            <MarkdownRenderer source={termsText} />
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 9, background: '#fee2e2', border: '1px solid #ef4444', fontSize: 13, color: '#991b1b' }}>
              {error}
            </div>
          )}

          <label
            style={{
              marginTop: 20,
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span>
              Li, compreendi e <strong>aceito integralmente</strong> os termos acima, incluindo as vedações de
              compartilhamento e a responsabilidade legal pela proteção do conteúdo.
            </span>
          </label>

          <div className="row gap-12" style={{ marginTop: 24, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={handleDecline} disabled={accepting}>
              Não aceito (sair)
            </button>
            <button
              className="btn btn-accent btn-lg"
              onClick={handleAccept}
              disabled={!checked || accepting}
            >
              {accepting ? 'Registrando…' : 'Aceito os termos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
