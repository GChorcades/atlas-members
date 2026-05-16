import { db } from '@/db';
import { invoices, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant';
import { getFiscalConfigForUI } from '@/lib/fiscal-config';
import { FiscalSection } from './fiscal-section';

export default async function AdminFiscalPage() {
  const tenantId = await getTenantId();

  const fiscalConfig = await getFiscalConfigForUI();

  const tenantInvoices = await db
    .select({
      id: invoices.id,
      status: invoices.status,
      numero: invoices.numero,
      valor: invoices.valor,
      pdfUrl: invoices.pdfUrl,
      errorMessage: invoices.errorMessage,
      createdAt: invoices.createdAt,
      notifiedAt: invoices.notifiedAt,
      paymentId: invoices.paymentId,
      buyerName: users.name,
      buyerCpf: users.cpfCnpj,
    })
    .from(invoices)
    .leftJoin(users, eq(invoices.userId, users.id))
    .where(eq(invoices.tenantId, tenantId))
    .orderBy(desc(invoices.createdAt))
    .limit(200);

  const serializedInvoices = tenantInvoices.map((inv) => ({
    ...inv,
    createdAt: inv.createdAt.toISOString(),
    notifiedAt: inv.notifiedAt ? inv.notifiedAt.toISOString() : null,
  }));

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 className="h2">Nota Fiscal</h2>
        <p className="muted mt-4" style={{ fontSize: 13 }}>Configuração de NFS-e e histórico de notas emitidas</p>
      </div>

      <FiscalSection fiscalConfig={fiscalConfig} invoices={serializedInvoices} />
    </div>
  );
}
