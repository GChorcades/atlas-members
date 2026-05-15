import { headers } from 'next/headers';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { resolveTenant } from '@/lib/tenant';

/**
 * Contexto de e-mail por tenant.
 *
 * O remetente (nome + e-mail) pode ser definido em Configurações → Mensagens
 * (`brevo_sender_name` / `brevo_sender_email`). Sem configuração, cai no padrão
 * `slug@PLATFORM_DOMAIN` — o domínio guarda-chuva é autenticado uma vez no Brevo.
 */

const PLATFORM_DOMAIN = (process.env.PLATFORM_DOMAIN ?? '').toLowerCase().trim();
const FALLBACK_URL = 'https://claude-members.vercel.app';

export type TenantEmail = {
  appName: string;
  appUrl: string;
  sender: { name: string; email: string };
};

type TenantInfo = { id: string; name: string; slug: string; customDomain?: string | null };

function defaultSenderEmail(slug: string): string {
  if (PLATFORM_DOMAIN && slug) return `${slug}@${PLATFORM_DOMAIN}`;
  return process.env.BREVO_SENDER_EMAIL ?? '';
}

/** Lê o remetente configurado em Configurações → Mensagens, se houver. */
async function senderOverrides(tenantId: string): Promise<{ email: string; name: string }> {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(and(
      eq(settings.tenantId, tenantId),
      inArray(settings.key, ['brevo_sender_email', 'brevo_sender_name']),
    ));
  const m = Object.fromEntries(rows.map((r) => [r.key, (r.value ?? '').trim()]));
  return { email: m['brevo_sender_email'] ?? '', name: m['brevo_sender_name'] ?? '' };
}

/** Monta o contexto de e-mail a partir de dados explícitos do tenant. */
export async function tenantEmailFrom(t: TenantInfo): Promise<TenantEmail> {
  const ov = await senderOverrides(t.id);
  const appUrl = t.customDomain
    ? `https://${t.customDomain}`
    : PLATFORM_DOMAIN && t.slug
      ? `https://${t.slug}.${PLATFORM_DOMAIN}`
      : FALLBACK_URL;
  return {
    appName: t.name,
    appUrl,
    sender: {
      name: ov.name || t.name,
      email: ov.email || defaultSenderEmail(t.slug),
    },
  };
}

/** Contexto de e-mail do tenant da requisição atual (resolvido pelo host). */
export async function getTenantEmail(): Promise<TenantEmail> {
  const t = await resolveTenant();
  const ctx = await tenantEmailFrom({ id: t.id, name: t.name, slug: t.slug });
  // Para os links do e-mail, preferir o host real da requisição.
  try {
    const host = (await headers()).get('host');
    if (host) ctx.appUrl = `https://${host.split(':')[0]}`;
  } catch {
    /* sem contexto de requisição — mantém o appUrl derivado do slug */
  }
  return ctx;
}
