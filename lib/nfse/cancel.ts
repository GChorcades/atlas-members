import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { getFiscalCompany } from '@/lib/fiscal-config';
import { buildCancelEventXml } from '@/lib/nfse/event';
import { enviarEvento } from '@/lib/nfse/client';

/** Cancela a NFS-e de um pagamento. Nunca lança. */
export async function cancelInvoiceForPayment(
  paymentId: string,
  motivo = 'Pagamento estornado',
): Promise<{ ok: boolean }> {
  const [inv] = await db.select().from(invoices)
    .where(eq(invoices.paymentId, paymentId)).limit(1);
  if (!inv || inv.status !== 'autorizada' || !inv.chaveAcesso) return { ok: false };
  try {
    const company = await getFiscalCompany(inv.tenantId);
    const { xml } = buildCancelEventXml({
      chaveAcesso: inv.chaveAcesso, motivoCodigo: '1', motivoDescricao: motivo, company,
    });
    await enviarEvento(xml, company);
    await db.update(invoices)
      .set({ status: 'cancelada', canceledAt: new Date() })
      .where(eq(invoices.id, inv.id));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
