import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invoices, payments, users } from '@/db/schema';
import { getFiscalCompany } from '@/lib/fiscal-config';
import { loadPfxFromBuffer, signXml, ensureCertificateMatchesCompany } from '@/lib/nfse/sign';
import { buildXml } from '@/lib/nfse/xml';
import { enviarDps, baixarXmlNfse, extractXmlFromResponse, baixarDanfse } from '@/lib/nfse/client';
import { put } from '@vercel/blob';
import { notifyInvoice } from '@/lib/notifications';

/**
 * Emite a NFS-e de um pagamento. Idempotente: se já existe invoice
 * autorizada para o paymentId, retorna-a sem reemitir. Nunca lança —
 * falhas viram invoice status 'erro'.
 */
export async function emitInvoiceForPayment(paymentId: string): Promise<{ ok: boolean; invoiceId: string }> {
  const [existing] = await db.select().from(invoices)
    .where(eq(invoices.paymentId, paymentId)).limit(1);
  if (existing && existing.status === 'autorizada') return { ok: true, invoiceId: existing.id };

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) return { ok: false, invoiceId: '' };
  const [user] = await db.select().from(users).where(eq(users.id, payment.userId)).limit(1);
  if (!user) return { ok: false, invoiceId: '' };

  const invoiceId = existing?.id ?? nanoid();
  try {
    const company = await getFiscalCompany(payment.tenantId);
    const cert = loadPfxFromBuffer(company.pfxBuffer, company.pfxPassword);
    ensureCertificateMatchesCompany(cert, { nome: company.razaoSocial, cnpj: company.cnpj });

    const { xml, dpsId, referenceXPath, signatureParentXPath } = buildXml({
      toma: {
        nome: user.name, doc: user.cpfCnpj ?? '', email: user.email,
        fone: user.phone ?? undefined,
        endereco: {
          xLgr: user.addrLogradouro ?? undefined, nro: user.addrNumero ?? undefined,
          xCpl: user.addrComplemento ?? undefined, xBairro: user.addrBairro ?? undefined,
          cMun: undefined, uf: user.addrUf ?? undefined, cep: user.addrCep ?? undefined,
        },
      },
      serv: { xDescServ: payment.description ?? 'Acesso a curso' },
      valores: { vServ: payment.value },
    }, company);

    const signed = signXml(xml, dpsId, cert, referenceXPath, signatureParentXPath);
    const response = await enviarDps(signed, company);
    const chave = response?.chaveAcesso ?? null;
    let finalXml = extractXmlFromResponse(response) ?? signed;
    if (chave) {
      try { finalXml = await baixarXmlNfse(chave, company); } catch { /* mantém o assinado */ }
    }

    const row = {
      id: invoiceId, tenantId: payment.tenantId, paymentId, userId: user.id,
      status: (chave ? 'autorizada' : 'erro') as 'autorizada' | 'erro',
      chaveAcesso: chave, serie: company.serie, valor: payment.value,
      dpsXml: signed, nfseXml: finalXml,
      errorMessage: chave ? null : 'Resposta sem chave de acesso',
      responseJson: JSON.stringify(response ?? {}),
    };
    await db.insert(invoices).values(row)
      .onConflictDoUpdate({ target: invoices.id, set: row });
    if (chave) {
      await fetchAndStoreInvoicePdf(invoiceId).catch(() => {});
    }
    return { ok: !!chave, invoiceId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    const row = {
      id: invoiceId, tenantId: payment.tenantId, paymentId, userId: user.id,
      status: 'erro' as const, valor: payment.value, errorMessage: msg,
    };
    await db.insert(invoices).values(row)
      .onConflictDoUpdate({ target: invoices.id, set: { status: 'erro', errorMessage: msg } });
    return { ok: false, invoiceId };
  }
}

/** Baixa o DANFSE do governo e guarda no Blob. Retorna a URL ou null. */
export async function fetchAndStoreInvoicePdf(invoiceId: string): Promise<string | null> {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv || !inv.chaveAcesso || inv.status !== 'autorizada') return null;
  try {
    const company = await getFiscalCompany(inv.tenantId);
    const pdf = await baixarDanfse(inv.chaveAcesso, company);
    const blob = await put(`nfse/${inv.chaveAcesso}.pdf`, pdf, {
      access: 'public', contentType: 'application/pdf',
    });
    await db.update(invoices).set({ pdfUrl: blob.url }).where(eq(invoices.id, inv.id));
    try {
      const [buyer] = await db.select().from(users).where(eq(users.id, inv.userId)).limit(1);
      if (buyer) {
        await notifyInvoice(
          { name: buyer.name, email: buyer.email, phone: buyer.phone },
          { pdfUrl: blob.url, numero: inv.numero },
        );
      }
    } catch { /* envio não bloqueia */ }
    return blob.url;
  } catch {
    return null; // DANFSE instável — re-tentável pelo painel
  }
}
