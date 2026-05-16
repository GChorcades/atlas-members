'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { fiscalConfig } from '@/db/schema';
import { getTenantId } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';
import { emitInvoiceForPayment } from '@/lib/nfse/emit';

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
