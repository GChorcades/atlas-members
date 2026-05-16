import { NextResponse } from 'next/server';
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
  const certFields = {
    pfxData: encryptSecret(buffer.toString('base64')),
    pfxPassword: encryptSecret(password),
    certSubject: cert.subject,
    certValidoAte: cert.validTo ? new Date(cert.validTo) : null,
    updatedAt: new Date(),
  };
  await db.insert(fiscalConfig)
    .values({ tenantId, ...certFields })
    .onConflictDoUpdate({ target: fiscalConfig.tenantId, set: certFields });
  return NextResponse.json({ ok: true, subject: cert.subject, validoAte: cert.validTo });
}
