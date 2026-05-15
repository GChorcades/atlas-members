import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant';
import SettingsClient from './settings-client';

/** Chaves sensíveis: nunca enviadas ao navegador — só um indicador de "preenchido". */
const SECRET_KEYS = ['asaas_api_key', 'asaas_webhook_secret', 'panda_api_key'] as const;

export default async function AdminSettingsPage() {
  const tenantId = await getTenantId();
  const rows = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));

  // Não vaza segredos para o cliente: envia em branco + um mapa de quais já têm valor.
  const secretsSet: Record<string, boolean> = {};
  for (const key of SECRET_KEYS) {
    secretsSet[key] = !!cfg[key]?.trim();
    cfg[key] = '';
  }

  const bunnyConfigured = !!(
    process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID &&
    process.env.BUNNY_API_KEY &&
    process.env.BUNNY_CDN_HOSTNAME
  );

  return (
    <SettingsClient
      initial={cfg}
      secretsSet={secretsSet}
      bunnyEnv={{
        libraryId: process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID ?? '',
        cdnHostname: process.env.BUNNY_CDN_HOSTNAME ?? '',
        configured: bunnyConfigured,
      }}
      messagingEnv={{
        brevoApiKey: !!process.env.BREVO_API_KEY,
        brevoSenderEmail: process.env.BREVO_SENDER_EMAIL ?? '',
        brevoSenderName: process.env.BREVO_SENDER_NAME ?? '',
        zapiInstanceId: !!process.env.ZAPI_INSTANCE_ID,
        zapiToken: !!process.env.ZAPI_TOKEN,
        zapiClientToken: !!process.env.ZAPI_CLIENT_TOKEN,
      }}
    />
  );
}
