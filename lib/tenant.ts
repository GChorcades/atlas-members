import { cache } from 'react';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { tenants, DEFAULT_TENANT_ID } from '@/db/schema';

/**
 * Resolução de tenant (multi-tenant — Fase 2).
 *
 * O tenant é determinado pelo `Host` da requisição:
 *  - `cliente.PLATFORM_DOMAIN`  → tenant pelo subdomínio (`tenants.slug`)
 *  - domínio próprio            → tenant por `tenants.customDomain`
 *  - deploy padrão / localhost  → tenant padrão (transição single → multi)
 *
 * `PLATFORM_DOMAIN` é a env var com o domínio guarda-chuva da plataforma
 * (ex.: `suaplataforma.com.br`). Enquanto não estiver definida, tudo cai
 * no tenant padrão — comportamento atual preservado.
 */

const PLATFORM_DOMAIN = (process.env.PLATFORM_DOMAIN ?? '').toLowerCase().trim();

export type ResolvedTenant = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

type TenantKey = { subdomain: string } | { customDomain: string } | null;

/** Deriva a chave do tenant a partir do host bruto. `null` → tenant padrão. */
function tenantKeyFromHost(rawHost: string): TenantKey {
  const host = rawHost.split(':')[0].toLowerCase().trim();
  if (!host) return null;

  // Hosts que não pertencem a nenhum tenant → tenant padrão
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')) {
    return null;
  }

  if (PLATFORM_DOMAIN) {
    if (host === PLATFORM_DOMAIN || host === `www.${PLATFORM_DOMAIN}`) return null;
    if (host.endsWith(`.${PLATFORM_DOMAIN}`)) {
      return { subdomain: host.slice(0, -(PLATFORM_DOMAIN.length + 1)) };
    }
  }

  // Qualquer outro host é um domínio próprio de tenant
  return { customDomain: host };
}

/** Resolve o tenant da requisição atual (memoizado por request). */
export const resolveTenant = cache(async (): Promise<ResolvedTenant> => {
  const h = await headers();
  const key = tenantKeyFromHost(h.get('host') ?? '');

  let row: typeof tenants.$inferSelect | undefined;
  if (key && 'subdomain' in key) {
    [row] = await db.select().from(tenants).where(eq(tenants.slug, key.subdomain)).limit(1);
  } else if (key && 'customDomain' in key) {
    [row] = await db.select().from(tenants).where(eq(tenants.customDomain, key.customDomain)).limit(1);
  }

  // Fallback: tenant padrão (deploy atual / host não mapeado)
  if (!row) {
    [row] = await db.select().from(tenants).where(eq(tenants.id, DEFAULT_TENANT_ID)).limit(1);
  }
  if (!row) {
    throw new Error('Tenant padrão não encontrado — rode a migração multi-tenant.');
  }

  return { id: row.id, name: row.name, slug: row.slug, active: row.active };
});

/** ID do tenant da requisição atual — usado para escopar todas as queries. */
export const getTenantId = cache(async (): Promise<string> => {
  return (await resolveTenant()).id;
});
