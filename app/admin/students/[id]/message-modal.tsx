'use client';

import { useState } from 'react';
import { adminSendMessage } from '@/lib/actions';

type Props = {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  onClose: () => void;
};

export default function MessageModal({ userId, userName, userEmail, userPhone, onClose }: Props) {
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setError('');
    if (!body.trim()) { setError('Escreva a mensagem.'); return; }
    if (channel === 'whatsapp' && !userPhone) { setError('Este aluno não tem telefone cadastrado.'); return; }
    setSending(true);
    try {
      const res = await adminSendMessage({ userId, channel, subject, body });
      if (res.ok) setSent(true);
      else setError(res.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'grid', placeItems: 'center', padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 500, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Enviar mensagem</h3>
          <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>Para <strong>{userName}</strong></p>
        </div>

        <div style={{ padding: 20 }}>
          {sent ? (
            <>
              <div style={{ padding: '10px 14px', borderRadius: 9, background: '#dcfce7', border: '1px solid #22c55e', fontSize: 12.5, color: '#166534', marginBottom: 16 }}>
                Mensagem enviada com sucesso por {channel === 'email' ? 'e-mail' : 'WhatsApp'}.
              </div>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-accent" onClick={onClose}>Fechar</button>
              </div>
            </>
          ) : (
            <>
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 9, background: '#fee2e2', border: '1px solid #ef4444', fontSize: 12.5, color: '#991b1b', marginBottom: 14 }}>
                  {error}
                </div>
              )}

              <div className="field-group" style={{ marginBottom: 14 }}>
                <label className="field-label">Canal</label>
                <div className="row gap-8">
                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className={`btn btn-sm ${channel === 'email' ? 'btn-accent' : 'btn-ghost'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    E-mail
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('whatsapp')}
                    className={`btn btn-sm ${channel === 'whatsapp' ? 'btn-accent' : 'btn-ghost'}`}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    WhatsApp
                  </button>
                </div>
                <span className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                  {channel === 'email' ? userEmail : (userPhone || 'Sem telefone cadastrado')}
                </span>
              </div>

              {channel === 'email' && (
                <div className="field-group" style={{ marginBottom: 14 }}>
                  <label className="field-label">Assunto</label>
                  <input
                    className="input-field"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Mensagem da plataforma"
                  />
                </div>
              )}

              <div className="field-group" style={{ marginBottom: 16 }}>
                <label className="field-label">Mensagem</label>
                <textarea
                  className="input-field"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  placeholder="Escreva sua mensagem…"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={onClose} disabled={sending}>Cancelar</button>
                <button className="btn btn-accent" onClick={handleSend} disabled={sending}>
                  {sending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
