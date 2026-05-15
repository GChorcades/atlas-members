import { db } from '@/db';
import { payments, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PaymentPoller from './payment-poller';

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { slug } = await params;
  const { p } = await searchParams;
  if (!p) notFound();

  const [pay] = await db.select().from(payments).where(eq(payments.id, p)).limit(1);
  if (!pay) notFound();

  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, pay.userId)).limit(1);

  const isPaid = pay.status === 'received' || pay.status === 'confirmed';
  const isPix = pay.billingType === 'PIX';
  const isBoleto = pay.billingType === 'BOLETO';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 16px' }}>
      {!isPaid && <PaymentPoller paymentId={pay.id} />}
      <div className="card" style={{ maxWidth: 560, margin: '0 auto', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {isPaid ? '✓' : isPix ? '◷' : '✉'}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: 0, fontWeight: 400 }}>
            {isPaid ? 'Pagamento confirmado!' : isPix ? 'Escaneie para pagar via PIX' : isBoleto ? 'Boleto gerado' : 'Pagamento em processamento'}
          </h1>
          <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
            Valor: R$ {pay.value.toFixed(2).replace('.', ',')}
          </p>
        </div>

        {isPix && pay.pixQrCode && !isPaid && (
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${pay.pixQrCode}`}
              alt="QR Code PIX"
              style={{ width: 240, height: 240, border: '1px solid var(--border)', borderRadius: 8 }}
            />
            {pay.pixPayload && (
              <div style={{ marginTop: 16 }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>PIX copia e cola</div>
                <textarea
                  readOnly
                  className="input-field"
                  rows={3}
                  defaultValue={pay.pixPayload}
                  style={{ fontFamily: 'monospace', fontSize: 11 }}
                />
              </div>
            )}
          </div>
        )}

        {isBoleto && pay.bankSlipUrl && !isPaid && (
          <div style={{ marginBottom: 24 }}>
            <a href={pay.bankSlipUrl} target="_blank" rel="noopener" className="btn btn-accent btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              Ver boleto
            </a>
          </div>
        )}

        {pay.invoiceUrl && (
          <div style={{ marginBottom: 16 }}>
            <a href={pay.invoiceUrl} target="_blank" rel="noopener" className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              Ver fatura
            </a>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16, fontSize: 13 }}>
          {isPaid ? (
            <>
              <p>Sua conta foi criada e você já está matriculado no curso.</p>
              <div style={{ marginTop: 12, padding: 14, background: 'var(--surface-2, rgba(0,0,0,0.04))', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Login (e-mail)</div>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 15, fontWeight: 500, marginTop: 4, wordBreak: 'break-all' }}>
                    {user?.email ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Senha temporária</div>
                  <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 18, fontWeight: 600, marginTop: 4 }}>123321</div>
                </div>
                <div className="muted" style={{ fontSize: 11 }}>
                  Recomendamos trocar a senha após o primeiro acesso.
                </div>
              </div>
              <p style={{ marginTop: 12 }}>
                <Link href="/login" style={{ color: 'var(--accent)' }}>Faça login para acessar →</Link>
              </p>
            </>
          ) : (
            <>
              <p className="muted">
                Após a confirmação do pagamento, você será matriculado automaticamente no curso e receberá acesso por e-mail.
              </p>
              <p style={{ marginTop: 12 }}>
                <Link href={`/checkout/${slug}`} style={{ color: 'var(--accent)' }}>← Voltar</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
