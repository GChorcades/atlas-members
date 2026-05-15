/**
 * Orquestração de notificações: dispara email (Brevo) + WhatsApp (Z-API) em paralelo.
 * Falhas são logadas mas não interrompem o fluxo principal.
 *
 * Multi-tenant: o nome, a URL e o remetente seguem o tenant da requisição
 * (ou um tenant explícito, no caso do webhook do Asaas — que não tem host).
 */
import { sendEmail } from './brevo';
import { sendWhatsApp } from './zapi';
import { getTenantEmail, tenantEmailFrom, type TenantEmail } from './tenant-email';

function baseLayout(appName: string, title: string, body: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f5f0;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#fff;border:1px solid #e5e5e0;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px 8px;">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#888;">${appName}</div>
          <h1 style="font-size:22px;margin:8px 0 16px;font-weight:700;letter-spacing:-.01em;">${title}</h1>
        </td></tr>
        <tr><td style="padding:0 32px 28px;font-size:15px;line-height:1.55;color:#1a1a1a;">
          ${body}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #eee;font-size:12px;color:#888;">
          Este é um email automático. Em caso de dúvida, responda esta mensagem.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

type User = { name: string; email: string; phone?: string | null };
type TenantOverride = { name: string; slug: string; customDomain?: string | null };

export async function notifyWelcome(user: User, tempPassword?: string) {
  const ctx = await getTenantEmail();
  const title = `Bem-vindo(a) à ${ctx.appName}`;
  const passwordBlock = tempPassword
    ? `<p>Sua senha temporária é:</p>
       <p style="font-family:ui-monospace,monospace;background:#f5f5f0;padding:12px 14px;border-radius:8px;font-size:15px;letter-spacing:.04em;">${tempPassword}</p>
       <p>Recomendamos trocar a senha após o primeiro login em <a href="${ctx.appUrl}/profile">${ctx.appUrl}/profile</a>.</p>`
    : `<p>Sua conta foi criada com sucesso. Use a senha que você definiu no cadastro para acessar.</p>`;

  const html = baseLayout(
    ctx.appName,
    title,
    `<p>Olá, <strong>${user.name}</strong>!</p>
     <p>Sua conta foi criada e você já pode acessar a plataforma.</p>
     ${passwordBlock}
     <p style="margin-top:24px;">
       <a href="${ctx.appUrl}/login" style="display:inline-block;background:#1a1a1a;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Acessar plataforma</a>
     </p>`,
  );

  const wa = tempPassword
    ? `Olá, ${user.name}! Sua conta na ${ctx.appName} foi criada.\n\n🔐 Senha temporária: ${tempPassword}\n\nAcesse: ${ctx.appUrl}/login\n\nRecomendamos trocar a senha no primeiro acesso.`
    : `Olá, ${user.name}! Sua conta na ${ctx.appName} foi criada.\n\nAcesse: ${ctx.appUrl}/login`;

  return dispatch(user, title, html, wa, ctx.sender);
}

export async function notifyPasswordReset(user: User, newPassword: string) {
  const ctx = await getTenantEmail();
  const title = 'Sua senha foi redefinida';
  const html = baseLayout(
    ctx.appName,
    title,
    `<p>Olá, <strong>${user.name}</strong>.</p>
     <p>Um administrador redefiniu sua senha. Sua nova senha é:</p>
     <p style="font-family:ui-monospace,monospace;background:#f5f5f0;padding:12px 14px;border-radius:8px;font-size:15px;letter-spacing:.04em;">${newPassword}</p>
     <p>Por segurança, recomendamos alterar a senha após o login em <a href="${ctx.appUrl}/profile">${ctx.appUrl}/profile</a>.</p>
     <p style="margin-top:24px;">
       <a href="${ctx.appUrl}/login" style="display:inline-block;background:#1a1a1a;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Fazer login</a>
     </p>`,
  );
  const wa = `Olá, ${user.name}. Sua senha na ${ctx.appName} foi redefinida.\n\n🔐 Nova senha: ${newPassword}\n\nAcesse: ${ctx.appUrl}/login\n\nRecomendamos trocar a senha após o login.`;
  return dispatch(user, title, html, wa, ctx.sender);
}

export async function notifyForgotPassword(user: User, resetLink: string) {
  const ctx = await getTenantEmail();
  const title = 'Redefinição de senha';
  const html = baseLayout(
    ctx.appName,
    title,
    `<p>Olá, <strong>${user.name}</strong>.</p>
     <p>Recebemos um pedido para redefinir sua senha. Clique no botão abaixo para criar uma nova senha (o link expira em 1 hora):</p>
     <p style="margin:20px 0;">
       <a href="${resetLink}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Criar nova senha</a>
     </p>
     <p style="font-size:13px;color:#666;">Se você não pediu esta redefinição, ignore este email.</p>`,
  );
  const wa = `Olá, ${user.name}. Pedido de redefinição de senha na ${ctx.appName}.\n\nLink (expira em 1h): ${resetLink}\n\nSe não foi você, ignore esta mensagem.`;
  return dispatch(user, title, html, wa, ctx.sender);
}

export async function notifyPaymentConfirmed(
  user: User,
  args: { description: string; value: number },
  tenant?: TenantOverride,
) {
  // O webhook do Asaas não tem host — recebe o tenant explicitamente.
  const ctx: TenantEmail = tenant ? tenantEmailFrom(tenant) : await getTenantEmail();
  const valueFmt = args.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const title = 'Pagamento confirmado';
  const html = baseLayout(
    ctx.appName,
    title,
    `<p>Olá, <strong>${user.name}</strong>!</p>
     <p>Recebemos seu pagamento de <strong>${valueFmt}</strong> referente a:</p>
     <p style="background:#f5f5f0;padding:12px 14px;border-radius:8px;">${args.description}</p>
     <p>Seu acesso já está liberado. Bons estudos!</p>
     <p style="margin-top:24px;">
       <a href="${ctx.appUrl}/dashboard" style="display:inline-block;background:#1a1a1a;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Ir para o painel</a>
     </p>`,
  );
  const wa = `✅ Pagamento confirmado!\n\nOlá, ${user.name}. Recebemos seu pagamento de ${valueFmt} (${args.description}).\n\nSeu acesso está liberado: ${ctx.appUrl}/dashboard`;
  return dispatch(user, title, html, wa, ctx.sender);
}

async function dispatch(
  user: User,
  subject: string,
  htmlContent: string,
  waMessage: string,
  sender: { name: string; email: string },
) {
  const tasks: Promise<unknown>[] = [];
  tasks.push(
    sendEmail({ to: { email: user.email, name: user.name }, subject, htmlContent, from: sender }).catch((e) => {
      console.error('[notifications] email falhou', e);
      return { ok: false };
    }),
  );
  if (user.phone) {
    tasks.push(
      sendWhatsApp(user.phone, waMessage).catch((e) => {
        console.error('[notifications] whatsapp falhou', e);
        return { ok: false };
      }),
    );
  }
  await Promise.allSettled(tasks);
}
