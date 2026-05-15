'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPublicCheckoutCharge } from '@/lib/actions';

type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

export default function CheckoutScreen({
  slug,
  price,
  courseTitle,
  coverGlyph,
  coverBg,
  coverImage,
  allowPix,
  allowBoleto,
  allowCreditCard,
  maxInstallments,
}: {
  slug: string;
  price: number;
  courseTitle: string;
  coverGlyph?: string | null;
  coverBg?: string | null;
  coverImage?: string | null;
  allowPix: boolean;
  allowBoleto: boolean;
  allowCreditCard: boolean;
  maxInstallments: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const firstAllowed: BillingType = allowCreditCard ? 'CREDIT_CARD' : allowPix ? 'PIX' : 'BOLETO';
  const [billingType, setBillingType] = useState<BillingType>(firstAllowed);
  const [installments, setInstallments] = useState(1);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);

    const payload = {
      name: String(fd.get('name') ?? '').trim(),
      email: String(fd.get('email') ?? '').trim(),
      cpfCnpj: String(fd.get('cpfCnpj') ?? '').replace(/\D/g, ''),
      phone: String(fd.get('phone') ?? '').trim(),
      postalCode: String(fd.get('postalCode') ?? '').replace(/\D/g, ''),
      billingType,
      installmentCount: billingType === 'CREDIT_CARD' ? installments : undefined,
      creditCard: billingType === 'CREDIT_CARD' ? {
        holderName: String(fd.get('cc_holder') ?? '').trim(),
        number: String(fd.get('cc_number') ?? ''),
        expiryMonth: String(fd.get('cc_exp') ?? '').split('/')[0]?.trim() ?? '',
        expiryYear: (() => {
          const y = String(fd.get('cc_exp') ?? '').split('/')[1]?.trim() ?? '';
          return y.length === 2 ? `20${y}` : y;
        })(),
        ccv: String(fd.get('cc_ccv') ?? '').trim(),
      } : undefined,
    };

    if (!payload.name || !payload.email || !payload.cpfCnpj || !payload.phone || !payload.postalCode) {
      setError('Preencha e-mail, nome, celular, CPF e CEP.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await createPublicCheckoutCharge(slug, payload);
        router.push(`/checkout/${slug}/success?p=${res.paymentId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao processar pagamento.');
      }
    });
  }

  const installmentValue = price / installments;
  const isCard = billingType === 'CREDIT_CARD';

  return (
    <form
      onSubmit={submit}
      className="card"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 320px',
        gap: 0,
        maxWidth: 1060,
        margin: '0 auto',
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {error && <div className="auth-error">{error}</div>}

        <Section title="Informações Pessoais" subtitle="Para quem devemos enviar o acesso?">
          <label className="field-group">
            <input className="input-field" name="email" type="email" required placeholder="E-mail*" />
          </label>
          <label className="field-group">
            <input className="input-field" name="name" required placeholder="Nome completo*" />
          </label>
          <div className="row" style={{ gap: 12 }}>
            <label className="field-group" style={{ flex: 1 }}>
              <input className="input-field" name="phone" required placeholder="Celular*" />
            </label>
            <label className="field-group" style={{ flex: 1 }}>
              <input className="input-field" name="cpfCnpj" required placeholder="CPF*" />
            </label>
          </div>
        </Section>

        <Section title="Endereço de cobrança" subtitle="Necessário para emissão da cobrança.">
          <label className="field-group" style={{ maxWidth: 220 }}>
            <input className="input-field" name="postalCode" required placeholder="CEP*" inputMode="numeric" />
          </label>
        </Section>

        <Section title="Método de Pagamento" subtitle="Escolha o seu método de pagamento abaixo">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {allowCreditCard && (
              <MethodCard
                selected={billingType === 'CREDIT_CARD'}
                onClick={() => setBillingType('CREDIT_CARD')}
                label="Cartão de Crédito"
                rightSlot={<BrandBadges />}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                  <label className="field-group">
                    <input className="input-field" name="cc_number" required={isCard} placeholder="Número do cartão" inputMode="numeric" />
                  </label>
                  <label className="field-group">
                    <input className="input-field" name="cc_holder" required={isCard} placeholder="Nome impresso no cartão" />
                  </label>
                  <div className="row" style={{ gap: 10 }}>
                    <label className="field-group" style={{ flex: 1 }}>
                      <input className="input-field" name="cc_exp" required={isCard} placeholder="MM/AA" />
                    </label>
                    <label className="field-group" style={{ flex: 1 }}>
                      <input className="input-field" name="cc_ccv" required={isCard} placeholder="CVV" maxLength={4} inputMode="numeric" />
                    </label>
                  </div>
                  {maxInstallments > 1 && (
                    <label className="field-group">
                      <select className="input-field" value={installments} onChange={(e) => setInstallments(parseInt(e.target.value, 10))}>
                        {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            Parcelas: {n}x de R$ {(price / n).toFixed(2).replace('.', ',')}{n === 1 ? ' à vista' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </MethodCard>
            )}

            {allowPix && (
              <MethodCard
                selected={billingType === 'PIX'}
                onClick={() => setBillingType('PIX')}
                label="PIX"
                rightSlot={<PixBadge />}
              />
            )}

            {allowBoleto && (
              <MethodCard
                selected={billingType === 'BOLETO'}
                onClick={() => setBillingType('BOLETO')}
                label="Boleto"
                rightSlot={<BoletoBadge />}
              />
            )}
          </div>
        </Section>

        <button type="submit" disabled={pending} className="btn btn-accent btn-lg" style={{ justifyContent: 'center', gap: 8 }}>
          <LockIcon />
          {pending ? 'Processando…' : 'Finalizar compra'}
        </button>

        <div className="muted" style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
          Pagamento processado por Asaas com criptografia ponta a ponta.
        </div>
      </div>

      <aside style={{ background: 'var(--surface-2, rgba(0,0,0,0.03))', padding: '32px 28px', borderLeft: '1px solid var(--border)' }}>
        <div className="row" style={{ alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 8,
              background: coverImage
                ? `url(${coverImage}) center/cover`
                : (coverBg ?? 'linear-gradient(135deg, #1a1a2e, #16213e)'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              color: 'white',
              flexShrink: 0,
            }}
          >
            {!coverImage && (coverGlyph ?? '◆')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Produto</div>
            <div style={{ fontWeight: 500, fontSize: 14, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {courseTitle}
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>R$ {price.toFixed(2).replace('.', ',')}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <Row label="Subtotal" value={`R$ ${price.toFixed(2).replace('.', ',')}`} />
          <Row label="Entrega" value="—" />
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 500 }}>Total</span>
              <span style={{ textAlign: 'right' }}>
                <strong style={{ fontSize: 16 }}>
                  {isCard && installments > 1
                    ? `${installments}x R$ ${installmentValue.toFixed(2).replace('.', ',')}`
                    : `R$ ${price.toFixed(2).replace('.', ',')}`}
                </strong>
                {isCard && installments > 1 && (
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    ou R$ {price.toFixed(2).replace('.', ',')} à vista
                  </div>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 24, fontSize: 12, color: 'var(--muted)' }}>
          <LockIcon />
          <span>Compra 100% segura</span>
        </div>
      </aside>
    </form>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
        {subtitle && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function MethodCard({
  selected,
  onClick,
  label,
  rightSlot,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: 14,
        cursor: 'pointer',
        background: selected ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
        transition: 'border-color 0.15s ease',
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
          </span>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{label}</span>
        </div>
        {rightSlot}
      </div>
      {selected && children}
    </div>
  );
}

function BrandBadges() {
  const brands: Array<[string, string, string]> = [
    ['VISA', '#1A1F71', '#fff'],
    ['MC', '#EB001B', '#fff'],
    ['AMEX', '#006FCF', '#fff'],
    ['ELO', '#FFCB05', '#000'],
  ];
  return (
    <div className="row" style={{ gap: 4 }}>
      {brands.map(([name, bg, fg]) => (
        <span
          key={name}
          style={{
            background: bg,
            color: fg,
            fontSize: 9,
            fontWeight: 700,
            padding: '3px 6px',
            borderRadius: 3,
            letterSpacing: '0.04em',
          }}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

function PixBadge() {
  return (
    <div className="row" style={{ gap: 6, alignItems: 'center', fontSize: 11, fontWeight: 600, color: '#32BCAD' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M12 3 L21 12 L12 21 L3 12 Z" />
        <path d="M7.5 7.5 L12 12 L7.5 16.5" />
        <path d="M16.5 7.5 L12 12 L16.5 16.5" />
      </svg>
      PIX
    </div>
  );
}

function BoletoBadge() {
  return (
    <svg width="32" height="20" viewBox="0 0 24 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" style={{ color: 'var(--muted)' }}>
      <path d="M3 3v10" />
      <path d="M6 3v10" />
      <path d="M9 3v10" />
      <path d="M12 3v10" />
      <path d="M15 3v10" />
      <path d="M18 3v10" />
      <path d="M21 3v10" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
