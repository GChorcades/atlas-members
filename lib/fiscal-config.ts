import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { fiscalConfig } from '@/db/schema';
import { getTenantId } from '@/lib/tenant';
import { decryptSecret } from '@/lib/nfse/cert-crypto';
import type { FiscalCompany } from '@/lib/nfse/types';

/** Linha bruta de fiscal_config do tenant atual (ou null). */
export async function getFiscalConfigRow() {
  const tenantId = await getTenantId();
  const [row] = await db.select().from(fiscalConfig).where(eq(fiscalConfig.tenantId, tenantId)).limit(1);
  return row ?? null;
}

/** Versão para a UI: sem pfxData/pfxPassword, com indicador de certificado. */
export async function getFiscalConfigForUI() {
  const row = await getFiscalConfigRow();
  if (!row) return null;
  const { pfxData, pfxPassword, ...rest } = row;
  return { ...rest, hasCertificate: !!pfxData, hasCertPassword: !!pfxPassword };
}

/** Monta o FiscalCompany decifrado para emissão. Lança se incompleto. */
export async function getFiscalCompany(tenantId?: string): Promise<FiscalCompany> {
  const id = tenantId ?? (await getTenantId());
  const [row] = await db.select().from(fiscalConfig).where(eq(fiscalConfig.tenantId, id)).limit(1);
  if (!row) throw new Error('Configuração fiscal não encontrada para este tenant.');
  if (!row.enabled) throw new Error('Emissão de nota fiscal desativada para este tenant.');
  if (!row.pfxData || !row.pfxPassword) throw new Error('Certificado digital não configurado.');
  if (!row.cnpj || !row.razaoSocial || !row.codMunicipio) throw new Error('Configuração fiscal incompleta.');
  return {
    cnpj: row.cnpj, razaoSocial: row.razaoSocial,
    inscricaoMunicipal: row.inscricaoMunicipal ?? undefined,
    email: row.email ?? undefined, fone: row.fone ?? undefined,
    enderNac: {
      xLgr: row.logradouro ?? '', nro: row.numero ?? '', xBairro: row.bairro ?? '',
      cMun: row.codMunicipio, uf: row.uf ?? '', cep: row.cep ?? '',
      xCpl: row.complemento ?? undefined,
    },
    regTrib: {
      opSimpNac: row.opSimpNac ?? '2', regApTribSN: row.regApTribSN ?? '0',
      regEspTrib: row.regEspTrib ?? '0', tribISSQN: row.tribISSQN ?? '1', tpRetISSQN: row.tpRetISSQN ?? '1',
    },
    cLocIncid: row.cLocIncid ?? row.codMunicipio, xLocIncid: row.xLocIncid ?? '',
    xLocEmi: row.xLocEmi ?? '', xLocPrestacao: row.xLocPrestacao ?? '',
    cTribNac: row.cTribNac ?? '', cTribMun: row.cTribMun ?? '', cNBS: row.cNBS ?? undefined,
    xTribNac: row.xTribNac ?? '', xTribMun: row.xTribMun ?? '', xNBS: row.xNBS ?? undefined,
    serie: row.serie ?? '1', tpAmb: row.tpAmb ?? '2',
    pfxBuffer: Buffer.from(decryptSecret(row.pfxData), 'base64'),
    pfxPassword: decryptSecret(row.pfxPassword),
  };
}
