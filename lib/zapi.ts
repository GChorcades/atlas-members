/**
 * Z-API WhatsApp client.
 * Docs: https://developer.z-api.io/message/send-message-text
 */

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length === 11 || digits.length === 10) return `55${digits}`;
  return null;
}

export async function sendWhatsApp(
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    console.warn('[zapi] credenciais ausentes — pulando envio');
    return { ok: false, error: 'Z-API não configurado' };
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    return { ok: false, error: 'Telefone inválido' };
  }

  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (clientToken) headers['Client-Token'] = clientToken;

    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone: normalized, message }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      console.error('[zapi] erro', res.status, body);
      return { ok: false, error: `Z-API ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[zapi] exception', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}
