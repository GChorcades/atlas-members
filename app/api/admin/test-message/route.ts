import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/brevo';
import { sendWhatsApp } from '@/lib/zapi';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const channel = body?.channel === 'whatsapp' ? 'whatsapp' : 'email';
  const to = typeof body?.to === 'string' ? body.to.trim() : '';
  if (!to) return NextResponse.json({ error: 'Informe o destinatário.' }, { status: 400 });

  if (channel === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }
    const res = await sendEmail({
      to: { email: to },
      subject: 'Teste de envio — plataforma',
      htmlContent: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;">
        <p>Esta é uma mensagem de <strong>teste</strong> enviada pelo painel administrativo.</p>
        <p>Se você recebeu este e-mail, a integração com o Brevo está funcionando.</p>
      </div>`,
    });
    return res.ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: res.error ?? 'Falha ao enviar e-mail.' }, { status: 502 });
  }

  // WhatsApp
  const msg = 'Mensagem de *teste* enviada pelo painel administrativo. Se você recebeu, a integração com o Z-API está funcionando.';
  const res = await sendWhatsApp(to, msg);
  return res.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: res.error ?? 'Falha ao enviar WhatsApp.' }, { status: 502 });
}
