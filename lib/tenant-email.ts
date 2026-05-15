import { headers } from 'next/headers';
import { resolveTenant } from '@/lib/tenant';

/**
 * Contexto de e-mail por tenant.
 *
 * O domínio da plataforma (`PLATFORM_DOMAIN`) é autenticado uma única vez no
 * Brevo — com isso, cada tenant pode enviar de `slug@PLATFORM_DOMAIN` sem
 * configuração extra. O nome e a URL nos e-mails também seguem o tenant.
 */

const PLATFORM_DOMAIN = (process.env.PLATFORM_DOMAIN ?? '').toLowerCase().trim();
const FALLBACK_URL = 'https://claude-members.vercel.app';

export type TenantEmail = {
  appName: string;
  appUrl: string;
  sender: { name: string; email: string };
};

type TenantInfo = { name: string; slug: string; customDomain?: string | null };

function senderEmailFor(slug: string): string {
  if (PLATFORM_DOMAIN && slug) return `${slug}@${PLATFORM_DOMAIN}`;
  return process.env.BREVO_SENDER_EMAIL ?? '';
}

/** Monta o contexto de e-mail a partir de dados explícitos do tenant. */
export function tenantEmailFrom(t: TenantInfo): TenantEmail {
  const appUrl = t.customDomain
    ? `https://${t.customDomain}`
    : PLATFORM_DOMAIN && t.slug
      ? `https://${t.slug}.${PLATFORM_DOMAIN}`
      : FALLBACK_URL;
  return {
    appName: t.name,
    appUrl,
    sender: { name: t.name, email: senderEmailFor(t.slug) },
  };
}

/** Contexto de e-mail do tenant da requisição atual (resolvido pelo host). */
export async function getTenantEmail(): Promise<TenantEmail> {
  const t = await resolveTenant();
  const ctx = tenantEmailFrom({ name: t.name, slug: t.slug });
  // Para os links do e-mail, preferir o host real da requisição.
  try {
    const host = (await headers()).get('host');
    if (host) ctx.appUrl = `https://${host.split(':')[0]}`;
  } catch {
    /* sem contexto de requisição — mantém o appUrl derivado do slug */
  }
  return ctx;
}
