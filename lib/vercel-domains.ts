/**
 * Integração com a API de domínios da Vercel.
 *
 * Ao criar/editar um tenant, o subdomínio (`slug.PLATFORM_DOMAIN`) e o
 * domínio próprio precisam ser registrados no projeto da Vercel para que
 * ela os sirva e emita o certificado SSL. No plano grátis isso é feito
 * domínio a domínio — esta automação substitui o passo manual no painel.
 */

const API = 'https://api.vercel.com';

type VercelConfig = { token: string; projectId: string; teamId?: string };

function config(): VercelConfig | null {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || undefined;
  if (!token || !projectId) return null;
  return { token, projectId, teamId };
}

/** Subdomínio do tenant na plataforma, ou `null` se PLATFORM_DOMAIN não definido. */
export function tenantSubdomain(slug: string): string | null {
  const platform = (process.env.PLATFORM_DOMAIN ?? '').trim().toLowerCase();
  return platform ? `${slug}.${platform}` : null;
}

/** Registra um domínio no projeto da Vercel. Idempotente. */
export async function attachDomain(domain: string): Promise<{ ok: boolean; error?: string }> {
  const c = config();
  if (!c) return { ok: false, error: 'Integração Vercel não configurada (VERCEL_API_TOKEN).' };

  const qs = c.teamId ? `?teamId=${c.teamId}` : '';
  try {
    const res = await fetch(`${API}/v10/projects/${c.projectId}/domains${qs}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    });
    if (res.ok) return { ok: true };

    const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
    const code = data.error?.code;
    // Já estava no projeto → tratamos como sucesso.
    if (code === 'domain_already_added' || res.status === 409) return { ok: true };
    return { ok: false, error: data.error?.message ?? `Vercel API respondeu ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Falha de rede ao chamar a Vercel.' };
  }
}

/** Remove um domínio do projeto da Vercel. Silencioso em caso de erro. */
export async function detachDomain(domain: string): Promise<void> {
  const c = config();
  if (!c) return;
  const qs = c.teamId ? `?teamId=${c.teamId}` : '';
  try {
    await fetch(`${API}/v9/projects/${c.projectId}/domains/${encodeURIComponent(domain)}${qs}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${c.token}` },
    });
  } catch {
    /* sem bloquear o fluxo */
  }
}
