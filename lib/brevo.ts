/**
 * Brevo (Sendinblue) transactional email client.
 * Docs: https://developers.brevo.com/reference/sendtransacemail
 */

type SendEmailParams = {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
};

export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME ?? senderEmail;

  if (!apiKey || !senderEmail) {
    console.warn('[brevo] BREVO_API_KEY ou BREVO_SENDER_EMAIL ausente — pulando envio');
    return { ok: false, error: 'Brevo não configurado' };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [params.to],
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[brevo] erro', res.status, body);
      return { ok: false, error: `Brevo ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[brevo] exception', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}
