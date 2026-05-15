'use client';

import { useState, useTransition } from 'react';
import { adminUpsertCheckout, adminDeleteCheckout, adminUpsertOffer, adminDeleteOffer, adminCreateCoupon, adminDeleteCoupon } from '@/lib/actions';

type Offer = { id: string; name: string; slug: string; price: number; active: boolean };
type Coupon = { id: string; code: string; discountType: 'percent' | 'fixed'; discountValue: number; expiresAt: string; active: boolean };

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
  socialProof: boolean | null;
  offers: Offer[];
  coupons: Coupon[];
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

function CopyableLink({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="muted" style={{ fontSize: 11.5 }}>{label}</span>
      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          onClick={(e) => e.currentTarget.select()}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 12,
            fontFamily: 'ui-monospace, monospace',
            padding: '5px 8px',
            border: '1px solid var(--border)',
            borderRadius: 6,
            background: 'var(--bg-muted)',
            color: 'var(--text)',
          }}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          style={{ flexShrink: 0 }}
        >
          {copied ? '✓ Copiado' : '📋 Copiar'}
        </button>
      </div>
    </div>
  );
}

function CouponChip({ code, discount, meta, inactive }: { code: string; discount: string; meta: string; inactive: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      className="row gap-6"
      style={{
        alignItems: 'center',
        padding: '5px 8px 5px 10px',
        borderRadius: 7,
        background: 'var(--bg-muted)',
        border: '1px solid var(--border)',
        fontSize: 12,
        opacity: inactive ? 0.55 : 1,
      }}
    >
      <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{code}</strong>
      <span className="muted">{discount}</span>
      <span className="muted" style={{ fontSize: 11 }}>· {meta}</span>
      <button
        type="button"
        title="Copiar código"
        aria-label="Copiar código do cupom"
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        style={{
          marginLeft: 2,
          padding: '2px 7px',
          fontSize: 11,
          fontWeight: 600,
          border: '1px solid var(--border)',
          borderRadius: 5,
          background: copied ? 'var(--accent)' : 'var(--bg-elevated)',
          color: copied ? 'var(--accent-fg)' : 'var(--text-muted)',
          cursor: 'pointer',
        }}
      >
        {copied ? '✓' : 'Copiar'}
      </button>
    </div>
  );
}

function CheckoutRow({ row, isOpen, onToggleOpen }: { row: Row; isOpen: boolean; onToggleOpen: () => void }) {
  const hasCheckout = !!row.checkoutId;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = row.slug ? `${origin}/checkout/${row.slug}` : '';

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

      {hasCheckout && row.offers.length > 0 && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Ofertas — links prontos para copiar
          </div>
          {row.offers.map((o) => (
            <CopyableLink
              key={o.id}
              label={`${o.name} · R$ ${o.price.toFixed(2).replace('.', ',')}${o.active ? '' : ' · (pausada)'}`}
              url={`${origin}/checkout/${o.slug}`}
            />
          ))}
        </div>
      )}

      {hasCheckout && row.coupons.length > 0 && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div className="muted" style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Cupons de desconto
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {row.coupons.map((c) => {
              const expired = new Date(c.expiresAt).getTime() < Date.now();
              const inactive = expired || !c.active;
              return (
                <CouponChip
                  key={c.id}
                  code={c.code}
                  discount={c.discountType === 'percent'
                    ? `${c.discountValue}% off`
                    : `R$ ${c.discountValue.toFixed(2).replace('.', ',')} off`}
                  meta={`${expired ? 'expirado' : `expira ${new Date(c.expiresAt).toLocaleDateString('pt-BR')}`}${!c.active && !expired ? ' · inativo' : ''}`}
                  inactive={inactive}
                />
              );
            })}
          </div>
        </div>
      )}

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
  const [socialProof, setSocialProof] = useState(row.socialProof ?? false);

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
          socialProof,
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

      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>Prova social</div>
        <label className="row" style={{ gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={socialProof} onChange={(e) => setSocialProof(e.target.checked)} />
          Exibir notificações de "alguém acabou de adquirir" na página de checkout
        </label>
      </div>

      {row.checkoutId ? (
        <>
          <OffersSection checkoutId={row.checkoutId} offers={row.offers} />
          <CouponsSection checkoutId={row.checkoutId} coupons={row.coupons} />
        </>
      ) : (
        <div className="muted" style={{ fontSize: 12, padding: '8px 0', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          Salve o checkout primeiro para poder criar ofertas e cupons.
        </div>
      )}

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

function OffersSection({ checkoutId, offers }: { checkoutId: string; offers: Offer[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  function add() {
    setError('');
    const priceNum = parseFloat(price);
    if (!name.trim()) { setError('Informe o nome da oferta.'); return; }
    if (!priceNum || priceNum <= 0) { setError('Preço da oferta inválido.'); return; }
    startTransition(async () => {
      try {
        await adminUpsertOffer({ checkoutId, name: name.trim(), slug: slug.trim() || undefined, price: priceNum, active: true });
        setName(''); setSlug(''); setPrice('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao criar oferta.');
      }
    });
  }

  function del(id: string) {
    if (!confirm('Remover esta oferta?')) return;
    startTransition(async () => { await adminDeleteOffer(id); });
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <div className="field-label" style={{ marginBottom: 8 }}>Ofertas (preços alternativos com link próprio)</div>
      {error && <div className="auth-error" style={{ marginBottom: 8 }}>{error}</div>}

      {offers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {offers.map((o) => (
            <div key={o.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-muted)', borderRadius: 8, gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{o.name}</span>
                <span className="muted" style={{ fontSize: 12 }}> · R$ {o.price.toFixed(2).replace('.', ',')}</span>
                <div style={{ fontSize: 11.5, marginTop: 2 }}>
                  <a href={`/checkout/${o.slug}`} target="_blank" rel="noopener" style={{ color: 'var(--accent)' }}>
                    {origin}/checkout/{o.slug} ↗
                  </a>
                </div>
              </div>
              <div className="row gap-6" style={{ flexShrink: 0 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(`${origin}/checkout/${o.slug}`)} title="Copiar link">📋</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => del(o.id)} disabled={pending} style={{ color: '#e54' }}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="field-group" style={{ flex: '2 1 160px' }}>
          <span className="field-label">Nome da oferta</span>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Lote promocional" />
        </label>
        <label className="field-group" style={{ flex: '1 1 110px' }}>
          <span className="field-label">Preço (R$)</span>
          <input className="input-field" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="197.00" />
        </label>
        <label className="field-group" style={{ flex: '1 1 130px' }}>
          <span className="field-label">Slug (opcional)</span>
          <input className="input-field" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto" />
        </label>
        <button type="button" className="btn btn-soft btn-sm" onClick={add} disabled={pending} style={{ marginBottom: 1 }}>
          {pending ? '…' : '+ Oferta'}
        </button>
      </div>
    </div>
  );
}

function CouponsSection({ checkoutId, coupons }: { checkoutId: string; coupons: Coupon[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [validDays, setValidDays] = useState('30');

  function add() {
    setError('');
    const valNum = parseFloat(discountValue);
    const daysNum = parseInt(validDays, 10);
    if (!code.trim()) { setError('Informe o código do cupom.'); return; }
    if (!valNum || valNum <= 0) { setError('Valor de desconto inválido.'); return; }
    if (!daysNum || daysNum <= 0) { setError('Validade em dias inválida.'); return; }
    startTransition(async () => {
      try {
        await adminCreateCoupon({ checkoutId, code: code.trim(), discountType, discountValue: valNum, validDays: daysNum });
        setCode(''); setDiscountValue('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao criar cupom.');
      }
    });
  }

  function del(id: string) {
    if (!confirm('Remover este cupom?')) return;
    startTransition(async () => { await adminDeleteCoupon(id); });
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      <div className="field-label" style={{ marginBottom: 8 }}>Cupons de desconto</div>
      {error && <div className="auth-error" style={{ marginBottom: 8 }}>{error}</div>}

      {coupons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {coupons.map((c) => {
            const expired = new Date(c.expiresAt).getTime() < Date.now();
            return (
              <div key={c.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-muted)', borderRadius: 8, gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}>{c.code}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {' · '}{c.discountType === 'percent' ? `${c.discountValue}% off` : `R$ ${c.discountValue.toFixed(2).replace('.', ',')} off`}
                  </span>
                  <div style={{ fontSize: 11.5, marginTop: 2, color: expired ? '#e54' : 'var(--text-muted)' }}>
                    {expired ? 'Expirado' : 'Expira'} em {new Date(c.expiresAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => del(c.id)} disabled={pending} style={{ color: '#e54', flexShrink: 0 }}>Remover</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="field-group" style={{ flex: '1 1 110px' }}>
          <span className="field-label">Código</span>
          <input className="input-field" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PROMO10" />
        </label>
        <label className="field-group" style={{ flex: '0 0 110px' }}>
          <span className="field-label">Tipo</span>
          <select className="input-field" value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}>
            <option value="percent">Porcentagem</option>
            <option value="fixed">Valor fixo</option>
          </select>
        </label>
        <label className="field-group" style={{ flex: '0 0 100px' }}>
          <span className="field-label">{discountType === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}</span>
          <input className="input-field" type="number" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'percent' ? '10' : '50'} />
        </label>
        <label className="field-group" style={{ flex: '0 0 100px' }}>
          <span className="field-label">Válido (dias)</span>
          <input className="input-field" type="number" value={validDays} onChange={(e) => setValidDays(e.target.value)} placeholder="30" />
        </label>
        <button type="button" className="btn btn-soft btn-sm" onClick={add} disabled={pending} style={{ marginBottom: 1 }}>
          {pending ? '…' : '+ Cupom'}
        </button>
      </div>
    </div>
  );
}
