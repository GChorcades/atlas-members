'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';

type Props = {
  userId: string;
  userHasCpfCnpj: boolean;
  courses: { id: string; title: string }[];
  onClose: () => void;
  onSubmitted: () => void;
  onCreate: (args: {
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
    value: number;
    dueDate: string;
    description?: string;
    courseId?: string;
    installmentCount?: number;
  }) => Promise<{ ok: boolean }>;
};

const BILLING_OPTIONS = [
  { value: 'PIX', label: 'PIX', icon: '⚡', description: 'Confirmação em segundos' },
  { value: 'BOLETO', label: 'Boleto', icon: '📄', description: 'Vencimento padrão' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito', icon: '💳', description: 'Até 12x' },
] as const;

export default function ChargeModal({ userHasCpfCnpj, courses, onClose, onSubmitted, onCreate }: Props) {
  const [billingType, setBillingType] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
  const [value, setValue] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState<string>('');
  const [installments, setInstallments] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const numValue = parseFloat(value.replace(',', '.'));
    if (!numValue || numValue <= 0) {
      setError('Informe um valor válido');
      return;
    }
    if (!dueDate) {
      setError('Informe a data de vencimento');
      return;
    }
    setSubmitting(true);
    try {
      await onCreate({
        billingType,
        value: numValue,
        dueDate,
        description: description || undefined,
        courseId: courseId || undefined,
        installmentCount: billingType === 'CREDIT_CARD' && installments > 1 ? installments : undefined,
      });
      onSubmitted();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cobrança');
      setSubmitting(false);
    }
  }

  const installmentValue = parseFloat(value.replace(',', '.')) / Math.max(installments, 1);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'grid', placeItems: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: '100%', maxWidth: 540, padding: 0, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Nova cobrança</h3>
          <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>A cobrança será criada no Asaas e enviada por e-mail.</p>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {!userHasCpfCnpj && (
            <div style={{ padding: '10px 14px', borderRadius: 9, background: '#fef3c7', border: '1px solid #f59e0b', fontSize: 12.5, color: '#92400e', marginBottom: 16 }}>
              ⚠️ Aluno sem CPF/CNPJ cadastrado. O Asaas vai rejeitar.
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 9, background: '#fee2e2', border: '1px solid #ef4444', fontSize: 12.5, color: '#991b1b', marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Billing type */}
          <div className="field-group" style={{ marginBottom: 16 }}>
            <label className="field-label">Forma de pagamento *</label>
            <div className="row gap-8">
              {BILLING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setBillingType(opt.value)}
                  className="col"
                  style={{
                    flex: 1, padding: 12, borderRadius: 10, gap: 4, alignItems: 'center',
                    border: `2px solid ${billingType === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                    background: billingType === opt.value ? 'var(--accent-soft)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{opt.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</span>
                  <span className="muted" style={{ fontSize: 10.5, textAlign: 'center' }}>{opt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Value + due date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div className="field-group">
              <label className="field-label">Valor (R$) *</label>
              <input
                className="input-field"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="299,90"
                style={{ fontFamily: 'var(--font-mono)' }}
                inputMode="decimal"
              />
            </div>
            <div className="field-group">
              <label className="field-label">Vencimento *</label>
              <input
                type="date"
                className="input-field"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Installments (credit card only) */}
          {billingType === 'CREDIT_CARD' && (
            <div className="field-group" style={{ marginBottom: 16 }}>
              <label className="field-label">Parcelamento</label>
              <select className="input-field" value={installments} onChange={(e) => setInstallments(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? 'À vista' : `${n}x de R$ ${installmentValue.toFixed(2).replace('.', ',')}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Course (optional) */}
          {courses.length > 0 && (
            <div className="field-group" style={{ marginBottom: 16 }}>
              <label className="field-label">Vincular a um curso (opcional)</label>
              <select className="input-field" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="">— Sem vínculo —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div className="field-group">
            <label className="field-label">Descrição</label>
            <input
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Curso de Marketing Digital — Mensal"
            />
          </div>
        </div>

        <div className="row gap-8" style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-muted)', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-accent" onClick={handleSubmit} disabled={submitting || !userHasCpfCnpj}>
            {submitting ? 'Criando…' : <><Icon name="check" size={14} /> Criar cobrança</>}
          </button>
        </div>
      </div>
    </div>
  );
}
