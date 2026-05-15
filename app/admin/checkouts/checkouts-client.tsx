'use client';

import { useState, useTransition } from 'react';
import { adminUpsertCheckout, adminToggleCheckoutActive, adminDeleteCheckout } from '@/lib/actions';

type Row = {
  courseId: string;
  title: string;
  instructor: string;
  checkoutId: string | null;
  slug: string | null;
  active: boolean | null;
  price: number | null;
  headline: string | null;
  description: string | null;
  allowPix: boolean | null;
  allowBoleto: boolean | null;
  allowCreditCard: boolean | null;
  maxInstallments: number | null;
};

export default function CheckoutsClient({ rows }: { rows: Row[] }) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {rows.map((r) => (
        <CheckoutRow
          key={r.courseId}
          row={r}
          isOpen={editing === r.courseId}
          onToggleOpen={() => setEditing(editing === r.courseId ? null : r.courseId)}
        />
      ))}
      {rows.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p className="muted">Nenhum curso cadastrado.</p>
        </div>
      )}
    </div>
  );
}

function CheckoutRow({ row, isOpen, onToggleOpen }: { row: Row; isOpen: boolean; onToggleOpen: () => void }) {
  const hasCheckout = !!row.checkoutId;
  const publicUrl = row.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/checkout/${row.slug}` : '';

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{row.title}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {row.instructor}
            {hasCheckout && (
              <>
                {' · '}
                <span style={{ color: row.active ? 'var(--accent)' : 'var(--muted)' }}>
                  ● {row.active ? 'Ativo' : 'Pausado'}
                </span>
                {' · R$ '}{(row.price ?? 0).toFixed(2).replace('.', ',')}
              </>
            )}
          </div>
          {hasCheckout && row.slug && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <a href={`/checkout/${row.slug}`} target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>
                /checkout/{row.slug} ↗
              </a>
            </div>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {hasCheckout && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigator.clipboard.writeText(publicUrl)}
              title="Copiar URL"
            >
              📋 Copiar link
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onToggleOpen}>
            {isOpen ? 'Fechar' : hasCheckout ? 'Editar' : 'Configurar'}
          </button>
        </div>
      </div>

      {isOpen && <CheckoutForm row={row} onClose={onToggleOpen} />}
    </div>
  );
}

function CheckoutForm({ row, onClose }: { row: Row; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [active, setActive] = useState(row.active ?? true);
  const [price, setPrice] = useState(row.price?.toString() ?? '');
  const [headline, setHeadline] = useState(row.headline ?? '');
  const [description, setDescription] = useState(row.description ?? '');
  const [slug, setSlug] = useState(row.slug ?? '');
  const [allowPix, setAllowPix] = useState(row.allowPix ?? true);
  const [allowBoleto, setAllowBoleto] = useState(row.allowBoleto ?? true);
  const [allowCreditCard, setAllowCreditCard] = useState(row.allowCreditCard ?? true);
  const [maxInstallments, setMaxInstallments] = useState(row.maxInstallments?.toString() ?? '12');

  function save() {
    setError('');
    const priceNum = parseFloat(price);
    if (!priceNum || priceNum <= 0) { setError('Preço inválido.'); return; }
    startTransition(async () => {
      try {
        await adminUpsertCheckout({
          id: row.checkoutId ?? undefined,
          courseId: row.courseId,
          slug: slug.trim() || undefined,
          active,
          price: priceNum,
          headline: headline.trim() || undefined,
          description: description.trim() || undefined,
          allowPix,
          allowBoleto,
          allowCreditCard,
          maxInstallments: parseInt(maxInstallments, 10) || 12,
        });
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao salvar.');
      }
    });
  }

  function remove() {
    if (!row.checkoutId) return;
    if (!confirm('Remover checkout deste curso?')) return;
    startTransition(async () => {
      try {
        await adminDeleteCheckout(row.checkoutId!);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao remover.');
      }
    });
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {error && <div className="auth-error">{error}</div>}

      <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
        <label className="field-group" style={{ flex: '1 1 200px' }}>
          <span className="field-label">Preço (R$)</span>
          <input className="input-field" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="299.90" />
        </label>
        <label className="field-group" style={{ flex: '1 1 200px' }}>
          <span className="field-label">Slug (URL)</span>
          <input className="input-field" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-gerado" />
        </label>
        <label className="field-group" style={{ alignSelf: 'flex-end' }}>
          <span className="row" style={{ gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativo
          </span>
        </label>
      </div>

      <label className="field-group">
        <span className="field-label">Título da página (opcional)</span>
        <input className="input-field" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Garanta seu acesso ao curso..." />
      </label>

      <label className="field-group">
        <span className="field-label">Descrição (opcional)</span>
        <textarea className="input-field" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>Métodos de pagamento</div>
        <div className="row" style={{ gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={allowPix} onChange={(e) => setAllowPix(e.target.checked)} /> PIX
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={allowBoleto} onChange={(e) => setAllowBoleto(e.target.checked)} /> Boleto
          </label>
          <label className="row" style={{ gap: 6 }}>
            <input type="checkbox" checked={allowCreditCard} onChange={(e) => setAllowCreditCard(e.target.checked)} /> Cartão
          </label>
          {allowCreditCard && (
            <label className="row" style={{ gap: 6, marginLeft: 16 }}>
              Parcelas até
              <select className="input-field" style={{ width: 80 }} value={maxInstallments} onChange={(e) => setMaxInstallments(e.target.value)}>
                {[1, 2, 3, 4, 6, 10, 12].map((n) => <option key={n} value={n}>{n}x</option>)}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <div>
          {row.checkoutId && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={remove} disabled={pending} style={{ color: '#e54' }}>
              Remover checkout
            </button>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={pending}>Cancelar</button>
          <button type="button" className="btn btn-accent btn-sm" onClick={save} disabled={pending}>
            {pending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
