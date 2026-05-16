# Emissão de NFS-e — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emitir nota fiscal de serviço (NFS-e) automaticamente a partir das compras, integrando direto com o Sistema Nacional de NFS-e, com a nota salva, enviada ao comprador e visível no painel admin.

**Architecture:** Núcleo de emissão portado do app CODEX (assinatura XML-DSig, montagem do XML da DPS, cliente mTLS, evento de cancelamento) para `lib/nfse/`. Config fiscal e notas por tenant em novas tabelas. Emissão disparada no webhook Asaas e no checkout; cancelamento no estorno. PDF baixado do endpoint DANFSE do governo. Telas em Configurações → Nota Fiscal e no detalhe do aluno.

**Tech Stack:** Next.js 16, Drizzle ORM + Neon Postgres, `node-forge` (PFX), `xml-crypto` + `@xmldom/xmldom` + `xpath` (assinatura/XML), `axios` (cliente mTLS), Vercel Blob (PDF), Brevo/Z-API (envio).

**Verificação:** o projeto não tem framework de testes. Verificação padrão: `npx tsc --noEmit` e `npm run build`. Para unidades de lógica pura, há scripts pontuais rodados com `npx tsx`. A emissão real é validada no ambiente de **homologação** do governo.

**Código-fonte de referência (porte):** `/Users/ritasilva/Desktop/📁 PROJETOS ATIVOS/CODEX/server/src/nfse/` — arquivos `sign.ts`, `xml.ts`, `client.ts`, `event.ts`. O template XML da DPS e os XSD estão na raiz do CODEX.

---

## File Structure

**Criar:**
- `lib/nfse/cert-crypto.ts` — cifra/decifra o `.pfx` e a senha (chave do `AUTH_SECRET`)
- `lib/nfse/sign.ts` — carrega PFX, assina XML (porte CODEX)
- `lib/nfse/xml.ts` — monta o XML da DPS (porte CODEX, adaptado ao `fiscal_config`)
- `lib/nfse/client.ts` — cliente mTLS do Sistema Nacional (porte CODEX)
- `lib/nfse/event.ts` — XML de cancelamento (porte CODEX)
- `lib/nfse/emit.ts` — orquestra emissão de uma nota para um pagamento
- `lib/nfse/cancel.ts` — orquestra cancelamento
- `lib/nfse/template.ts` — exporta o template XML da DPS como string
- `lib/fiscal-config.ts` — leitura/escrita do `fiscal_config` (com mascaramento)
- `lib/fiscal-actions.ts` — server actions: salvar config, emitir/cancelar manual
- `app/admin/settings/fiscal-section.tsx` — UI da aba Nota Fiscal (config + lista)
- `app/api/admin/fiscal/certificate/route.ts` — upload do `.pfx`
- `db/migrations/` — DDL aplicado via `psql` (ver Task 1)

**Modificar:**
- `db/schema.ts` — tabelas `fiscalConfig`, `invoices`; colunas de endereço em `users`
- `app/admin/settings/settings-client.tsx` — nova aba "Nota Fiscal"
- `app/admin/settings/page.tsx` — carrega o `fiscal_config`
- `app/checkout/[slug]/checkout-form.tsx` — endereço obrigatório
- `lib/actions.ts` — `createPublicCheckoutCharge` persiste endereço + dispara emissão
- `lib/asaas.ts` — endereço completo no customer
- `app/api/webhooks/asaas/route.ts` — dispara emissão/cancelamento
- `app/admin/students/[id]/...` — exibe notas do aluno
- `lib/notifications.ts` — template `notifyInvoice`
- `next.config.ts` — `maxDuration` para as rotas de emissão
- `package.json` — dependências novas

---

## FASE 1 — Schema, certificado e tela de configuração fiscal

### Task 1: Schema — tabelas fiscais e endereço do usuário

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 1: Adicionar colunas de endereço em `users`**

No bloco `pgTable('users', {...})`, depois de `phone`, adicionar:

```ts
  addrLogradouro: varchar('addr_logradouro', { length: 255 }),
  addrNumero: varchar('addr_numero', { length: 30 }),
  addrComplemento: varchar('addr_complemento', { length: 120 }),
  addrBairro: varchar('addr_bairro', { length: 120 }),
  addrCidade: varchar('addr_cidade', { length: 120 }),
  addrUf: varchar('addr_uf', { length: 2 }),
  addrCep: varchar('addr_cep', { length: 9 }),
```

- [ ] **Step 2: Adicionar a tabela `fiscalConfig`**

Após a tabela `settings`:

```ts
export const fiscalConfig = pgTable('fiscal_config', {
  tenantId: text('tenant_id').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  tpAmb: varchar('tp_amb', { length: 1 }).notNull().default('2'), // 2=homologação
  cnpj: varchar('cnpj', { length: 14 }),
  inscricaoMunicipal: varchar('inscricao_municipal', { length: 30 }),
  razaoSocial: varchar('razao_social', { length: 255 }),
  email: varchar('email', { length: 255 }),
  fone: varchar('fone', { length: 20 }),
  logradouro: varchar('logradouro', { length: 255 }),
  numero: varchar('numero', { length: 30 }),
  complemento: varchar('complemento', { length: 120 }),
  bairro: varchar('bairro', { length: 120 }),
  codMunicipio: varchar('cod_municipio', { length: 7 }),
  uf: varchar('uf', { length: 2 }),
  cep: varchar('cep', { length: 9 }),
  opSimpNac: varchar('op_simp_nac', { length: 1 }),
  regApTribSN: varchar('reg_ap_trib_sn', { length: 1 }),
  regEspTrib: varchar('reg_esp_trib', { length: 1 }),
  tribISSQN: varchar('trib_issqn', { length: 1 }),
  tpRetISSQN: varchar('tp_ret_issqn', { length: 1 }),
  cLocIncid: varchar('c_loc_incid', { length: 7 }),
  xLocIncid: varchar('x_loc_incid', { length: 150 }),
  xLocEmi: varchar('x_loc_emi', { length: 150 }),
  xLocPrestacao: varchar('x_loc_prestacao', { length: 150 }),
  cTribNac: varchar('c_trib_nac', { length: 20 }),
  cTribMun: varchar('c_trib_mun', { length: 20 }),
  cNBS: varchar('c_nbs', { length: 20 }),
  xTribNac: varchar('x_trib_nac', { length: 255 }),
  xTribMun: varchar('x_trib_mun', { length: 255 }),
  xNBS: varchar('x_nbs', { length: 255 }),
  serie: varchar('serie', { length: 5 }).notNull().default('1'),
  descricaoServicoPadrao: text('descricao_servico_padrao'),
  pfxData: text('pfx_data'),          // base64 cifrado
  pfxPassword: text('pfx_password'),  // cifrado
  certSubject: varchar('cert_subject', { length: 500 }),
  certValidoAte: timestamp('cert_valido_ate'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

- [ ] **Step 3: Adicionar a tabela `invoices`**

```ts
export const invoiceStatusEnum = pgEnum('invoice_status', ['pendente', 'autorizada', 'erro', 'cancelada']);

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().default(DEFAULT_TENANT_ID).references(() => tenants.id, { onDelete: 'cascade' }),
  paymentId: text('payment_id').references(() => payments.id, { onDelete: 'set null' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: invoiceStatusEnum('status').notNull().default('pendente'),
  chaveAcesso: varchar('chave_acesso', { length: 60 }),
  numero: varchar('numero', { length: 20 }),
  serie: varchar('serie', { length: 5 }),
  valor: real('valor').notNull(),
  dpsXml: text('dps_xml'),
  nfseXml: text('nfse_xml'),
  pdfUrl: text('pdf_url'),
  errorMessage: text('error_message'),
  responseJson: text('response_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  canceledAt: timestamp('canceled_at'),
});
```

`pgEnum` e `real` já são importados em `db/schema.ts` — confirmar; se faltar, adicionar ao import de `drizzle-orm/pg-core`.

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Aplicar no banco via psql**

As tabelas/colunas são novas (aditivo) — seguro. Rodar:

```bash
export DATABASE_URL="$(grep ^DATABASE_URL= .env.local | head -1 | cut -d= -f2-)"
npx drizzle-kit push --force
```

Se o `push` ficar interativo, aplicar o DDL gerado direto via `psql "$DATABASE_URL"`. Verificar: `psql "$DATABASE_URL" -c "\d fiscal_config" -c "\d invoices"`.
Expected: as duas tabelas existem.

- [ ] **Step 6: Commit**

```bash
git add db/schema.ts
git commit -m "feat(nfse): schema de fiscal_config, invoices e endereço do usuário"
```

---

### Task 2: Dependências npm

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar**

Run:
```bash
npm install node-forge xml-crypto @xmldom/xmldom xpath
npm install -D @types/node-forge
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build OK (sem uso ainda, só confirma que as deps instalaram).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(nfse): dependências de assinatura e XML"
```

---

### Task 3: Criptografia do certificado — `lib/nfse/cert-crypto.ts`

**Files:**
- Create: `lib/nfse/cert-crypto.ts`
- Test: `scripts/test-cert-crypto.ts`

- [ ] **Step 1: Escrever o teste de lógica pura**

Create `scripts/test-cert-crypto.ts`:

```ts
import { encryptSecret, decryptSecret } from '../lib/nfse/cert-crypto.js';

process.env.AUTH_SECRET ??= 'test-secret-para-rodar-o-script';
const original = 'conteúdo-sensível-do-certificado-12345';
const enc = encryptSecret(original);
if (enc === original) throw new Error('não cifrou');
const dec = decryptSecret(enc);
if (dec !== original) throw new Error(`decifrou errado: ${dec}`);
console.log('OK cert-crypto: round-trip íntegro');
```

- [ ] **Step 2: Rodar — deve falhar (módulo não existe)**

Run: `npx tsx scripts/test-cert-crypto.ts`
Expected: erro de import (arquivo não existe).

- [ ] **Step 3: Implementar `lib/nfse/cert-crypto.ts`**

```ts
import crypto from 'node:crypto';

/**
 * Cifra/decifra segredos do certificado (PFX e senha) com AES-256-GCM,
 * usando uma chave derivada do AUTH_SECRET. Defesa em profundidade — o
 * certificado nunca fica em texto puro no banco.
 */
function key(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET não configurado');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !encB64) throw new Error('payload cifrado inválido');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encB64, 'base64')), decipher.final()]).toString('utf8');
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npx tsx scripts/test-cert-crypto.ts`
Expected: `OK cert-crypto: round-trip íntegro`

- [ ] **Step 5: Commit**

```bash
git add lib/nfse/cert-crypto.ts scripts/test-cert-crypto.ts
git commit -m "feat(nfse): criptografia do certificado (AES-256-GCM)"
```

---

### Task 4: Porte de `lib/nfse/sign.ts`

**Files:**
- Create: `lib/nfse/sign.ts`
- Reference: `CODEX/server/src/nfse/sign.ts`

- [ ] **Step 1: Copiar e adaptar**

Copiar o conteúdo de `CODEX/server/src/nfse/sign.ts` para `lib/nfse/sign.ts`. Adaptações:
- `loadPfx(pfxPath, passphrase)` recebe **buffer** em vez de caminho. Trocar a assinatura para `loadPfxFromBuffer(pfxBuffer: Buffer, passphrase: string)` e remover `fs.readFileSync` (usar o buffer recebido direto em `forge.asn1.fromDer(pfxBuffer.toString('binary'))`).
- Remover o `import fs`.
- Manter `signXml`, `ensureCertificateMatchesCompany`, `CertMaterial`, `getCertificateMetadata` sem alteração de lógica.
- `CompanyIdentity` continua `{ nome?, cnpj? }`.

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/nfse/sign.ts
git commit -m "feat(nfse): porte da assinatura XML-DSig (PFX por buffer)"
```

---

### Task 5: Tipos e config fiscal — `lib/nfse/types.ts` + `lib/fiscal-config.ts`

**Files:**
- Create: `lib/nfse/types.ts`
- Create: `lib/fiscal-config.ts`

- [ ] **Step 1: Criar `lib/nfse/types.ts`**

Definir os tipos da emissão, espelhando `CODEX/server/src/types.ts` mas alinhados ao `fiscalConfig` do schema:

```ts
export type IssueInput = {
  toma: {
    nome: string; doc: string; email: string; fone?: string;
    endereco?: { xLgr?: string; nro?: string; xCpl?: string; xBairro?: string; cMun?: string; uf?: string; cep?: string };
  };
  serv: { xDescServ: string };
  valores: { vServ: number; vLiq?: number };
  meta?: { nDPS?: number; nNFSe?: number; serie?: string };
};

/** Espelha a linha de fiscal_config já decifrada e pronta para emitir. */
export type FiscalCompany = {
  cnpj: string; razaoSocial: string; inscricaoMunicipal?: string;
  email?: string; fone?: string;
  enderNac: { xLgr: string; nro: string; xBairro: string; cMun: string; uf: string; cep: string; xCpl?: string };
  regTrib: { opSimpNac: string; regApTribSN: string; regEspTrib: string; tribISSQN: string; tpRetISSQN: string };
  cLocIncid: string; xLocIncid: string; xLocEmi: string; xLocPrestacao: string;
  cTribNac: string; cTribMun: string; cNBS?: string;
  xTribNac: string; xTribMun: string; xNBS?: string;
  serie: string; tpAmb: string;
  pfxBuffer: Buffer; pfxPassword: string;
};
```

- [ ] **Step 2: Criar `lib/fiscal-config.ts`**

```ts
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
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/nfse/types.ts lib/fiscal-config.ts
git commit -m "feat(nfse): tipos de emissão e leitura da config fiscal"
```

---

### Task 6: Server actions e upload do certificado

**Files:**
- Create: `lib/fiscal-actions.ts`
- Create: `app/api/admin/fiscal/certificate/route.ts`
- Reference: `lib/actions.ts` (padrão de server actions admin)

- [ ] **Step 1: Criar `lib/fiscal-actions.ts` — salvar config**

```ts
'use server';

import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { fiscalConfig } from '@/db/schema';
import { getTenantId } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';

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
  const { pfxData, pfxPassword, certSubject, certValidoAte, ...safe } = data;
  await db.insert(fiscalConfig)
    .values({ tenantId, ...safe, updatedAt: new Date() })
    .onConflictDoUpdate({ target: fiscalConfig.tenantId, set: { ...safe, updatedAt: new Date() } });
  revalidatePath('/admin/settings');
  return { ok: true as const };
}
```

- [ ] **Step 2: Criar `app/api/admin/fiscal/certificate/route.ts` — upload do `.pfx`**

```ts
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/db';
import { fiscalConfig } from '@/db/schema';
import { getTenantId } from '@/lib/tenant';
import { encryptSecret } from '@/lib/nfse/cert-crypto';
import { loadPfxFromBuffer } from '@/lib/nfse/sign';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  const form = await req.formData();
  const file = form.get('file');
  const password = String(form.get('password') ?? '');
  if (!(file instanceof File) || !password) {
    return NextResponse.json({ error: 'Arquivo .pfx e senha são obrigatórios.' }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  let cert;
  try {
    cert = loadPfxFromBuffer(buffer, password);
  } catch {
    return NextResponse.json({ error: 'Certificado ou senha inválidos.' }, { status: 400 });
  }
  const tenantId = await getTenantId();
  await db.insert(fiscalConfig)
    .values({
      tenantId,
      pfxData: encryptSecret(buffer.toString('base64')),
      pfxPassword: encryptSecret(password),
      certSubject: cert.subject,
      certValidoAte: cert.validTo ? new Date(cert.validTo) : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: fiscalConfig.tenantId,
      set: {
        pfxData: encryptSecret(buffer.toString('base64')),
        pfxPassword: encryptSecret(password),
        certSubject: cert.subject,
        certValidoAte: cert.validTo ? new Date(cert.validTo) : null,
        updatedAt: new Date(),
      },
    });
  return NextResponse.json({ ok: true, subject: cert.subject, validoAte: cert.validTo });
}
```

- [ ] **Step 3: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros; a rota `/api/admin/fiscal/certificate` aparece no output.

- [ ] **Step 4: Commit**

```bash
git add lib/fiscal-actions.ts app/api/admin/fiscal/certificate/route.ts
git commit -m "feat(nfse): salvar config fiscal e upload do certificado"
```

---

### Task 7: Aba "Nota Fiscal" nas Configurações

**Files:**
- Create: `app/admin/settings/fiscal-section.tsx`
- Modify: `app/admin/settings/settings-client.tsx`
- Modify: `app/admin/settings/page.tsx`

- [ ] **Step 1: `page.tsx` carrega a config fiscal**

Em `app/admin/settings/page.tsx`, importar `getFiscalConfigForUI` de `@/lib/fiscal-config` e passar `fiscalConfig={await getFiscalConfigForUI()}` como prop ao `SettingsClient`.

- [ ] **Step 2: Criar `fiscal-section.tsx`**

Componente client que recebe `fiscalConfig` (a versão de UI, sem segredos) e renderiza:
- Toggle "Emissão de nota fiscal ativada"
- Seleção de ambiente (Homologação / Produção) — padrão Homologação
- Campos do emitente: CNPJ, Inscrição Municipal, Razão social, e-mail, telefone
- Campos de endereço do emitente: logradouro, número, complemento, bairro, código do município, UF, CEP
- Regime tributário: opSimpNac, regApTribSN, regEspTrib, tribISSQN, tpRetISSQN (com rótulos explicativos)
- Tributação do serviço: cTribNac, cTribMun, cNBS, xTribNac, xTribMun, xNBS, descrição padrão do serviço
- Série
- Upload do certificado: `<input type="file" accept=".pfx,.p12">` + campo senha → `POST /api/admin/fiscal/certificate` (multipart). Se `fiscalConfig.hasCertificate`, mostrar "Certificado configurado · válido até {certValidoAte} · {certSubject}" e o input em modo "substituir".
- Botão "Salvar" → `saveFiscalConfig(...)`.
- Reutilizar classes `field-group`, `input-field`, `btn`, `SectionCard` já usadas no arquivo.

A lista de notas emitidas é adicionada na Task 14.

- [ ] **Step 3: Registrar a aba em `settings-client.tsx`**

Adicionar `'fiscal'` ao tipo do `useState` de `tab`, um `<button className="tab">` "Nota Fiscal" (ícone `file`), e o bloco `{tab === 'fiscal' && <FiscalSection fiscalConfig={fiscalConfig} />}`. Adicionar `fiscalConfig` ao tipo `Props` e à assinatura da função.

- [ ] **Step 4: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add app/admin/settings/
git commit -m "feat(nfse): aba Nota Fiscal nas configurações (config + certificado)"
```

**FIM DA FASE 1** — Verificação funcional: abrir Configurações → Nota Fiscal, preencher os dados, subir o `.pfx` (usar o certificado de teste do CODEX), salvar. Conferir no banco que `fiscal_config` tem a linha com `pfx_data` cifrado.

---

## FASE 2 — Núcleo NFS-e e emissão manual

### Task 8: Template XML e porte de `lib/nfse/xml.ts`

**Files:**
- Create: `lib/nfse/template.ts`
- Create: `lib/nfse/xml.ts`
- Reference: `CODEX/server/src/nfse/xml.ts` e o template XML na raiz do CODEX (`33045572228715352000142000000000000126010115107041.xml`)

- [ ] **Step 1: Criar `lib/nfse/template.ts`**

Copiar o conteúdo do XML template da raiz do CODEX e exportá-lo como string:

```ts
/** Template base do XML da DPS/NFS-e (padrão nacional v1.01). */
export const DPS_TEMPLATE = `<?xml version="1.0" encoding="utf-8"?>
... (conteúdo do XML template do CODEX) ...`;
```

- [ ] **Step 2: Portar `lib/nfse/xml.ts`**

Copiar `CODEX/server/src/nfse/xml.ts` para `lib/nfse/xml.ts`. Adaptações:
- Remover `import fs` e `import { config }`. Em vez de `fs.readFileSync(TEMPLATE_PATH)`, usar `DPS_TEMPLATE` de `./template`.
- Trocar o tipo `CompanySettings` por `FiscalCompany` de `./types` (os nomes dos campos batem: `cnpj`, `razaoSocial`→ usar onde o CODEX usa `company.nome` trocar para `company.razaoSocial`, `enderNac`, `regTrib`, `cLocIncid`, etc.).
- Remover a lógica de `activities`/`applyActivity` (fora de escopo) — `input.serv` só tem `xDescServ`; os códigos de tributação vêm de `company`.
- Manter `buildXml`, `buildIds`, `mod11Dv` e os helpers de formatação sem mudança de lógica.

- [ ] **Step 3: Teste de lógica pura do `mod11Dv` e `buildXml`**

Create `scripts/test-nfse-xml.ts`:

```ts
import { buildXml } from '../lib/nfse/xml.js';
import type { FiscalCompany } from '../lib/nfse/types.js';

const company: FiscalCompany = {
  cnpj: '00000000000191', razaoSocial: 'Empresa Teste', inscricaoMunicipal: '123',
  enderNac: { xLgr: 'Rua A', nro: '1', xBairro: 'Centro', cMun: '3304557', uf: 'RJ', cep: '20000000' },
  regTrib: { opSimpNac: '1', regApTribSN: '1', regEspTrib: '0', tribISSQN: '1', tpRetISSQN: '1' },
  cLocIncid: '3304557', xLocIncid: 'Rio', xLocEmi: 'Rio', xLocPrestacao: 'Rio',
  cTribNac: '010701', cTribMun: '0', xTribNac: 'Curso', xTribMun: 'Curso',
  serie: '1', tpAmb: '2', pfxBuffer: Buffer.alloc(0), pfxPassword: '',
};
const { xml, dpsId } = buildXml(
  { toma: { nome: 'Aluno Teste', doc: '11144477735', email: 'a@b.com' },
    serv: { xDescServ: 'Acesso ao curso' }, valores: { vServ: 100 } },
  company,
);
if (!xml.includes('<xDescServ>Acesso ao curso</xDescServ>')) throw new Error('xDescServ ausente');
if (!dpsId.startsWith('DPS')) throw new Error('dpsId inválido');
console.log('OK nfse-xml: XML montado, dpsId =', dpsId);
```

- [ ] **Step 4: Rodar**

Run: `npx tsx scripts/test-nfse-xml.ts`
Expected: `OK nfse-xml: XML montado, dpsId = DPS...`

- [ ] **Step 5: Commit**

```bash
git add lib/nfse/template.ts lib/nfse/xml.ts scripts/test-nfse-xml.ts
git commit -m "feat(nfse): porte da montagem do XML da DPS"
```

---

### Task 9: Porte de `lib/nfse/client.ts` e `lib/nfse/event.ts`

**Files:**
- Create: `lib/nfse/client.ts`
- Create: `lib/nfse/event.ts`
- Reference: `CODEX/server/src/nfse/client.ts` e `event.ts`

- [ ] **Step 1: Portar `client.ts`**

Copiar `CODEX/server/src/nfse/client.ts`. Adaptações:
- Remover `import { config }` e `import { CompanySettings }`.
- A função `createAgent` recebe `pfxBuffer` + `pfxPassword` (via `FiscalCompany`) e chama `loadPfxFromBuffer`.
- `getBaseUrls` passa a depender só de `tpAmb` do `FiscalCompany`: `tpAmb === '1'` → URLs de produção (`DEFAULT_PROD_URLS`); senão → URLs de produção restrita (homologação): `https://adn.producaorestrita.nfse.gov.br/adn`, `/contribuintes`, `/danfse`, e `https://sefin.producaorestrita.nfse.gov.br/SefinNacional`.
- Manter `enviarDps`, `baixarDanfse`, `baixarXmlNfse`, `enviarEvento`, `extractXmlFromResponse`, `xmlToGzipBase64` — assinatura passa a receber `FiscalCompany` em vez de `CompanySettings`.

- [ ] **Step 2: Portar `event.ts`**

Copiar `CODEX/server/src/nfse/event.ts`. Trocar `CompanySettings` por `FiscalCompany` (usa só `company.tpAmb` e `company.cnpj`).

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/nfse/client.ts lib/nfse/event.ts
git commit -m "feat(nfse): porte do cliente mTLS e do evento de cancelamento"
```

---

### Task 10: Orquestrador de emissão — `lib/nfse/emit.ts`

**Files:**
- Create: `lib/nfse/emit.ts`

- [ ] **Step 1: Implementar `emitInvoiceForPayment`**

```ts
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { invoices, payments, users } from '@/db/schema';
import { getFiscalCompany } from '@/lib/fiscal-config';
import { loadPfxFromBuffer, signXml, ensureCertificateMatchesCompany } from '@/lib/nfse/sign';
import { buildXml } from '@/lib/nfse/xml';
import { enviarDps, baixarXmlNfse, extractXmlFromResponse } from '@/lib/nfse/client';

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
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add lib/nfse/emit.ts
git commit -m "feat(nfse): orquestrador de emissão por pagamento"
```

---

### Task 11: Emissão manual — server action + botão no detalhe do aluno

**Files:**
- Modify: `lib/fiscal-actions.ts`
- Modify: detalhe do aluno (localizar: `grep -rl "adminCreateAsaasCharge\|payments" app/admin/students`)

- [ ] **Step 1: Adicionar `emitInvoiceManual` em `lib/fiscal-actions.ts`**

```ts
import { emitInvoiceForPayment } from '@/lib/nfse/emit';

export async function emitInvoiceManual(paymentId: string) {
  await assertAdmin();
  const result = await emitInvoiceForPayment(paymentId);
  revalidatePath('/admin/students');
  return result;
}
```

- [ ] **Step 2: Botão "Emitir nota" no detalhe do aluno**

Localizar o componente client que lista os pagamentos do aluno no detalhe. Para cada pagamento com `status` recebido/confirmado, adicionar um botão "Emitir nota" que chama `emitInvoiceManual(payment.id)` dentro de um `useTransition`, e mostra o resultado (sucesso/erro).

- [ ] **Step 3: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/fiscal-actions.ts app/admin/students/
git commit -m "feat(nfse): emissão manual de nota a partir de um pagamento"
```

**FIM DA FASE 2** — Verificação funcional (homologação): com a config fiscal preenchida em ambiente Homologação e um pagamento de teste, clicar "Emitir nota" e conferir que a `invoice` é criada com `status='autorizada'` e `chaveAcesso` preenchida. Erros aparecem como `status='erro'` com mensagem.

---

## FASE 3 — Gatilhos automáticos, cancelamento e endereço no checkout

### Task 12: Endereço obrigatório no checkout

**Files:**
- Modify: `app/checkout/[slug]/checkout-form.tsx`
- Modify: `lib/actions.ts` (`createPublicCheckoutCharge`)
- Modify: `lib/asaas.ts`

- [ ] **Step 1: Campos de endereço obrigatórios no formulário**

Em `checkout-form.tsx`: tornar os inputs `street`, `addressNumber`, `neighborhood`, `city`, `uf` obrigatórios (`required`), e exibi-los sempre (não só após o lookup do CEP). Incluir os 5 campos + `postalCode` na validação do `submit` (hoje só `postalCode` é validado). Adicionar ao `payload` enviado: `addressNumber`, `street`, `neighborhood`, `city`, `uf`.

- [ ] **Step 2: `createPublicCheckoutCharge` recebe e persiste o endereço**

Em `lib/actions.ts`, no tipo do parâmetro `data` de `createPublicCheckoutCharge`, adicionar `street`, `addressNumber`, `neighborhood`, `city`, `uf` (strings). Ao criar/atualizar o `user`, gravar as colunas `addrLogradouro`, `addrNumero`, `addrBairro`, `addrCidade`, `addrUf`, `addrCep` (do `postalCode`). No `patch` do usuário existente, preencher esses campos quando vazios.

- [ ] **Step 3: Enviar endereço completo ao Asaas**

Em `lib/asaas.ts`, `asaasCreateCustomer`/`asaasUpdateCustomer` já aceitam `address`, `addressNumber`, `complement`, `province`, `city`, `state`, `postalCode` no tipo `AsaasCustomer`. Em `createPublicCheckoutCharge`, ao montar o `asaasCreateCustomer(...)` e o `creditCardHolderInfo`, passar todos esses campos (mapear `street`→`address`, `neighborhood`→`province`, `uf`→`state`).

- [ ] **Step 4: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add app/checkout/ lib/actions.ts lib/asaas.ts
git commit -m "feat(checkout): endereço obrigatório, persistido e enviado ao Asaas"
```

---

### Task 13: Gatilhos automáticos de emissão e cancelamento

**Files:**
- Create: `lib/nfse/cancel.ts`
- Modify: `app/api/webhooks/asaas/route.ts`
- Modify: `lib/actions.ts` (`createPublicCheckoutCharge`)
- Modify: `next.config.ts`

- [ ] **Step 1: Criar `lib/nfse/cancel.ts`**

```ts
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
```

`buildCancelEventXml` no CODEX recebe `company: CompanySettings` — após o porte (Task 9) ele recebe `FiscalCompany`. O XML do evento não é assinado por `signXml` no CODEX; manter o mesmo comportamento.

- [ ] **Step 2: Disparar emissão no checkout**

Em `lib/actions.ts`, dentro de `createPublicCheckoutCharge`, no bloco que já matricula o aluno quando `ours === 'received' || ours === 'confirmed'`, adicionar após a matrícula: `await emitInvoiceForPayment(paymentRowId).catch(() => {});` (import de `@/lib/nfse/emit`). A emissão nunca quebra o checkout.

- [ ] **Step 3: Disparar emissão/cancelamento no webhook**

Em `app/api/webhooks/asaas/route.ts`:
- No bloco `['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)`, depois da matrícula, chamar `await emitInvoiceForPayment(row.id).catch(() => {})`.
- Adicionar tratamento para `PAYMENT_REFUNDED`/`PAYMENT_CHARGEBACK`: chamar `await cancelInvoiceForPayment(row.id).catch(() => {})` (o `row` é o `payment` já buscado por `asaasPaymentId`).
- Imports de `@/lib/nfse/emit` e `@/lib/nfse/cancel`.

- [ ] **Step 4: `maxDuration` nas rotas de emissão**

Em `next.config.ts` não há config de duração por rota; usar o export de rota. No `app/api/webhooks/asaas/route.ts` adicionar no topo `export const maxDuration = 60;`. Server actions: o checkout (`createPublicCheckoutCharge`) roda na rota da página de checkout — adicionar `export const maxDuration = 60;` em `app/checkout/[slug]/page.tsx`.

- [ ] **Step 5: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add lib/nfse/cancel.ts app/api/webhooks/asaas/route.ts lib/actions.ts app/checkout/ next.config.ts
git commit -m "feat(nfse): emissão automática no pagamento e cancelamento no estorno"
```

**FIM DA FASE 3** — Verificação funcional: um checkout de teste pago confirma e gera a `invoice` automaticamente; um estorno marca a `invoice` como `cancelada`.

---

## FASE 4 — PDF, envio ao comprador e exibição das notas

### Task 14: Download do PDF (DANFSE) e armazenamento no Blob

**Files:**
- Modify: `lib/nfse/emit.ts`
- Create: `lib/fiscal-actions.ts` — adicionar `retryInvoicePdf`

- [ ] **Step 1: Função de download do PDF em `emit.ts`**

Adicionar a `lib/nfse/emit.ts`:

```ts
import { put } from '@vercel/blob';
import { baixarDanfse } from '@/lib/nfse/client';

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
    return blob.url;
  } catch {
    return null; // DANFSE instável — re-tentável pelo painel
  }
}
```

- [ ] **Step 2: Chamar o download após emissão autorizada**

No `emitInvoiceForPayment`, depois do `db.insert(invoices)` quando `chave` existe, adicionar `await fetchAndStoreInvoicePdf(invoiceId).catch(() => {});`.

- [ ] **Step 3: Server action `retryInvoicePdf`**

Em `lib/fiscal-actions.ts`:

```ts
import { fetchAndStoreInvoicePdf } from '@/lib/nfse/emit';

export async function retryInvoicePdf(invoiceId: string) {
  await assertAdmin();
  const url = await fetchAndStoreInvoicePdf(invoiceId);
  revalidatePath('/admin/students');
  return { ok: !!url, url };
}
```

- [ ] **Step 4: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/nfse/emit.ts lib/fiscal-actions.ts
git commit -m "feat(nfse): download do DANFSE e armazenamento no Blob"
```

---

### Task 15: Envio da nota ao comprador (e-mail + WhatsApp)

**Files:**
- Modify: `lib/notifications.ts`
- Modify: `lib/nfse/emit.ts`

- [ ] **Step 1: Template `notifyInvoice` em `notifications.ts`**

Adicionar uma função `notifyInvoice(user: User, args: { pdfUrl: string; numero?: string | null })` seguindo o padrão das outras `notify*`: usa `getTenantEmail()`, monta o HTML com `baseLayout` informando que a nota fiscal foi emitida e o link/anexo do PDF, monta a mensagem de WhatsApp com o link, e chama `dispatch(...)`.

- [ ] **Step 2: Disparar o envio após o PDF**

Em `fetchAndStoreInvoicePdf`, após salvar `pdfUrl` com sucesso, buscar o `user` da invoice e chamar `await notifyInvoice(...)` dentro de try/catch (falha de envio não quebra nada).

- [ ] **Step 3: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add lib/notifications.ts lib/nfse/emit.ts
git commit -m "feat(nfse): envio da nota ao comprador por e-mail e WhatsApp"
```

---

### Task 16: Lista de notas — aba Nota Fiscal e detalhe do aluno

**Files:**
- Modify: `app/admin/settings/fiscal-section.tsx`
- Modify: `app/admin/settings/page.tsx`
- Modify: detalhe do aluno (mesmo componente da Task 11)
- Modify: `lib/fiscal-actions.ts` — adicionar `cancelInvoiceManual`

- [ ] **Step 1: `cancelInvoiceManual` em `fiscal-actions.ts`**

```ts
import { cancelInvoiceForPayment } from '@/lib/nfse/cancel';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function cancelInvoiceManual(invoiceId: string, motivo: string) {
  await assertAdmin();
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!inv?.paymentId) return { ok: false };
  const result = await cancelInvoiceForPayment(inv.paymentId, motivo || 'Cancelamento manual');
  revalidatePath('/admin/settings');
  revalidatePath('/admin/students');
  return result;
}
```

- [ ] **Step 2: Lista de notas na aba Nota Fiscal**

Em `page.tsx`, carregar as notas do tenant: `db.select().from(invoices).where(eq(invoices.tenantId, tenantId)).orderBy(desc(invoices.createdAt)).limit(100)` e passar como prop. Em `fiscal-section.tsx`, abaixo da config, renderizar a tabela: data, comprador, valor, status (badge), link do PDF (ou botão "Baixar PDF" → `retryInvoicePdf` quando `pdfUrl` nulo), botão "Cancelar" quando `autorizada`.

- [ ] **Step 3: Notas no detalhe do aluno**

No detalhe do aluno, carregar `invoices` daquele `userId` e renderizar uma seção "Notas fiscais" com status, link do PDF, e ações (baixar PDF / cancelar) — reaproveitando os mesmos botões.

- [ ] **Step 4: Verificar tipos e build**

Run: `npx tsc --noEmit && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add app/admin/
git commit -m "feat(nfse): lista de notas na aba Nota Fiscal e no detalhe do aluno"
```

**FIM DA FASE 4** — Verificação funcional: emitir uma nota em homologação, conferir que o PDF é baixado e aparece na aba Nota Fiscal e no detalhe do aluno, que o e-mail/WhatsApp chegam, e que "Cancelar" marca a nota como cancelada.

---

## Fechamento

- [ ] Atualizar `CLAUDE.md` com a seção de NFS-e (tabelas, `lib/nfse/`, gatilhos, ambiente homologação/produção, gotcha do DANFSE instável).
- [ ] Deploy: `vercel --prod --yes`.
- [ ] Garantir que `BLOB_READ_WRITE_TOKEN` está nas env vars da Vercel (já usado pelo upload existente — confirmar).

## Notas de verificação

- Não há framework de testes; a verificação por tarefa é `npx tsc --noEmit` + `npm run build`, e os scripts `npx tsx scripts/test-*.ts` para lógica pura.
- A emissão real só é validada no ambiente de **homologação** (produção restrita) do governo — manter `tpAmb='2'` até o tenant validar ponta a ponta.
- O certificado de teste do CODEX (`3S - Certificado Digital 2025-2026.pfx`) pode ser usado para validar o upload e a assinatura na Fase 1/2.
