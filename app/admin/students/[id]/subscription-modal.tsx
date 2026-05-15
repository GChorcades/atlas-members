'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';

type Props = {
  userId: string;
  userHasCpfCnpj: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  onCreate: (args: {
    plan: 'free' | 'monthly' | 'annual' | 'lifetime';
    cycle: 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    value: number;
    nextDueDate: string;
    description?: string;
  }) => Promise<{ ok: boolean }>;
};

const PLAN_CYCLES: Record<string, 'MONTHLY' | 'YEARLY'> = {
  monthly: 'MONTHLY',
  annual: 'YEARLY',
};

export default function SubscriptionModal({ userHasCpfCnpj, onClose, onSubmitted, onCreate }: Props) {
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly');
  const [billingType, setBillingType] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('CREDIT_CARD');
  const [value, setValue] = useState('');
  const [nextDueDate, setNextDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const numValue = parseFloat(value.replace(',', '.'));
    if (!numValue || numValue <= 0) {
      setError('Informe um valor válido');
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        plan,
        cycle: PLAN_CYCLES[plan],
        billingType,
        value: numValue,
        nextDueDate,
        description: description || undefined,
      });
      onSubmitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar assinatura');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'grid', placeItems: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: '100%', maxWidth: 520, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Nova assinatura</h3>
          <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>Cobrança recorrente no Asaas. O plano do aluno será atualizado automaticamente.</p>
        </div>

        <div style={{ padding: 20 }}>
          {!userHasCpfCnpj && (
            <div style={{ padding: '10px 14px', borderRadius: 9, background: '#fef3c7', border: '1px solid #f59e0b', fontSize: 12.5, color: '#92400e', marginBottom: 16 }}>
              ⚠️ Aluno sem CPF/CNPJ cadastrado.
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 9, background: '#fee2e2', border: '1px solid #ef4444', fontSize: 12.5, color: '#991b1b', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div className="field-group" style={{ marginBottom: 16 }}>
            <label className="field-label">Plano *</label>
            <div className="row gap-8">
              {[
                { value: 'monthly' as const, label: 'Mensal', cycle: 'todo mês' },
                { value: 'annual' as const, label: 'Anual', cycle: 'todo ano' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPlan(opt.value)}
                  style={{
                    flex: 1, padding: '12px 14px', borderRadius: 10, textAlign: 'center',
                    border: `2px solid ${plan === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                    background: plan === opt.value ? 'var(--accent-soft)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{opt.label}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>cobrado {opt.cycle}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="field-group" style={{ marginBottom: 16 }}>
            <label className="field-label">Forma de pagamento *</label>
            <select className="input-field" value={billingType} onChange={(e) => setBillingType(e.target.value as 'PIX' | 'BOLETO' | 'CREDIT_CARD')}>
              <option value="CREDIT_CARD">Cartão de crédito</option>
              <option value="PIX">PIX</option>
              <option value="BOLETO">Boleto</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="field-group">
              <label className="field-label">Valor (R$) *</label>
              <input
                className="input-field"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="99,90"
                style={{ fontFamily: 'var(--font-mono)' }}
                inputMode="decimal"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Primeiro vencimento *</label>
              <input type="date" className="input-field" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Descrição</label>
            <input
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Atlas Members — Plano Anual"
            />
          </div>
        </div>

        <div className="row gap-8" style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-muted)', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-accent" onClick={handleSubmit} disabled={submitting || !userHasCpfCnpj}>
            {submitting ? 'Criando…' : <><Icon name="check" size={14} /> Criar assinatura</>}
          </button>
        </div>
      </div>
    </div>
  );
}
