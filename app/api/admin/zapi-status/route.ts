import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    return NextResponse.json({ connected: false, error: 'Z-API não configurado (faltam ZAPI_INSTANCE_ID / ZAPI_TOKEN).' });
  }

  try {
    const headers: Record<string, string> = {};
    if (clientToken) headers['Client-Token'] = clientToken;
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/status`,
      { headers, cache: 'no-store' },
    );
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ connected: false, error: `Z-API ${res.status}: ${body.slice(0, 200)}` });
    }
    const data = await res.json();
    // Z-API retorna { connected: boolean, ... }
    return NextResponse.json({
      connected: !!data.connected,
      session: data.session ?? null,
      raw: data,
    });
  } catch (err) {
    return NextResponse.json({
      connected: false,
      error: err instanceof Error ? err.message : 'Erro ao consultar Z-API.',
    });
  }
}
