'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { fiscalConfig, invoices } from '@/db/schema';
import { getTenantId } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';
import { emitInvoiceForPayment, fetchAndStoreInvoicePdf } from '@/lib/nfse/emit';
import { cancelInvoiceForPayment } from '@/lib/nfse/cancel';
import { eq } from 'drizzle-orm';

async function assertAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') throw new Error('Acesso negado');
  return session;
}

type FiscalConfigInput = Partial<typeof fiscalConfig.$inferInsert>;

export async function saveFiscalConfig(data: FiscalConfigInput) {
  await assertAdmin();
  const tenantId = await getTenantId();
  // pfxData/pfxPassword/certSubject/certValidoAte NUNCA vêm por aqui — só pelo upload.
  const { pfxData, pfxPassword, certSubject, certValidoAte, tenantId: _t, ...safe } = data;
  await db.insert(fiscalConfig)
    .values({ tenantId, ...safe, updatedAt: new Date() })
    .onConflictDoUpdate({ target: fiscalConfig.tenantId, set: { ...safe, updatedAt: new Date() } });
  revalidatePath('/admin/settings');
  return { ok: true as const };
}

export async function emitInvoiceManual(paymentId: string) {
  await assertAdmin();
  const result = await emitInvoiceForPayment(paymentId);
  revalidatePath('/admin/students');
  return result;
}

export async function retryInvoicePdf(invoiceId: string) {
  await assertAdmin();
  const url = await fetchAndStoreInvoicePdf(invoiceId);
  revalidatePath('/admin/settings');
  revalidatePath('/admin/students');
  return { ok: !!url, url };
}

export async function cancelInvoiceManual(invoiceId: string, motivo: string) {
  await assertAdmin();
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv?.paymentId) return { ok: false };
  const result = await cancelInvoiceForPayment(inv.paymentId, motivo || 'Cancelamento manual');
  revalidatePath('/admin/settings');
  revalidatePath('/admin/students');
  return result;
}
