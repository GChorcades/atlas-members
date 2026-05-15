'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { db } from '@/db';
import { platformAdmins, tenants, users } from '@/db/schema';
import {
  SUPER_ADMIN_COOKIE,
  createSuperAdminToken,
  getSuperAdmin,
} from '@/lib/super-admin';
import { attachDomain, detachDomain, tenantSubdomain } from '@/lib/vercel-domains';

const RESERVED_SLUGS = new Set([
  'www', 'app', 'admin', 'api', 'super-admin', 'login', 'register',
  'checkout', 'dashboard', 'mail', 'static', 'assets', 'cdn',
]);

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

// ─── Autenticação ────────────────────────────────────────────────────────────

export async function superAdminLogin(
  _prev: unknown,
  formData: FormData,
): Promise<{ error: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Informe e-mail e senha.' };

  const [admin] = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.email, email))
    .limit(1);
  if (!admin) return { error: 'E-mail ou senha inválidos.' };

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return { error: 'E-mail ou senha inválidos.' };

  (await cookies()).set(SUPER_ADMIN_COOKIE, createSuperAdminToken(admin.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });

  redirect('/super-admin');
}

export async function superAdminLogout(): Promise<void> {
  (await cookies()).delete(SUPER_ADMIN_COOKIE);
  redirect('/super-admin/login');
}

// ─── CRUD de tenants ───────────────────────────────────────────────────────────

async function assertSuperAdmin() {
  const admin = await getSuperAdmin();
  if (!admin) throw new Error('Não autenticado.');
  return admin;
}

export async function createTenant(data: {
  name: string;
  slug: string;
  customDomain?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}): Promise<{ ok: true; tenantId: string; warning?: string } | { ok: false; error: string }> {
  await assertSuperAdmin();

  const name = data.name.trim();
  const slug = normalizeSlug(data.slug || data.name);
  const customDomain = data.customDomain?.trim().toLowerCase() || null;
  const adminName = data.adminName.trim();
  const adminEmail = data.adminEmail.trim().toLowerCase();

  if (name.length < 2) return { ok: false, error: 'Nome do tenant muito curto.' };
  if (!slug || slug.length < 2) return { ok: false, error: 'Subdomínio inválido.' };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, error: `O subdomínio "${slug}" é reservado.` };
  if (adminName.length < 2) return { ok: false, error: 'Nome do administrador muito curto.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return { ok: false, error: 'E-mail do administrador inválido.' };
  if (data.adminPassword.length < 8) return { ok: false, error: 'A senha do administrador deve ter ao menos 8 caracteres.' };

  const [slugTaken] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (slugTaken) return { ok: false, error: `O subdomínio "${slug}" já está em uso.` };

  if (customDomain) {
    const [domainTaken] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.customDomain, customDomain))
      .limit(1);
    if (domainTaken) return { ok: false, error: `O domínio "${customDomain}" já está em uso.` };
  }

  const tenantId = `tnt_${nanoid(14)}`;
  await db.insert(tenants).values({ id: tenantId, name, slug, customDomain, active: true });

  const passwordHash = await bcrypt.hash(data.adminPassword, 12);
  await db.insert(users).values({
    id: nanoid(),
    tenantId,
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: 'admin',
    termsAcceptedAt: new Date(),
  });

  // Registra os domínios do tenant no projeto da Vercel.
  const warnings: string[] = [];
  const subdomain = tenantSubdomain(slug);
  if (subdomain) {
    const r = await attachDomain(subdomain);
    if (!r.ok) warnings.push(`Subdomínio ${subdomain}: ${r.error}`);
  }
  if (customDomain) {
    const r = await attachDomain(customDomain);
    if (!r.ok) warnings.push(`Domínio ${customDomain}: ${r.error}`);
  }

  revalidatePath('/super-admin');
  return { ok: true, tenantId, warning: warnings.length ? warnings.join(' · ') : undefined };
}

export async function updateTenant(
  id: string,
  data: { name: string; slug: string; customDomain?: string },
): Promise<{ ok: true; warning?: string } | { ok: false; error: string }> {
  await assertSuperAdmin();

  const name = data.name.trim();
  const slug = normalizeSlug(data.slug);
  const customDomain = data.customDomain?.trim().toLowerCase() || null;

  const [current] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!current) return { ok: false, error: 'Tenant não encontrado.' };

  if (name.length < 2) return { ok: false, error: 'Nome do tenant muito curto.' };
  if (!slug || slug.length < 2) return { ok: false, error: 'Subdomínio inválido.' };
  if (RESERVED_SLUGS.has(slug)) return { ok: false, error: `O subdomínio "${slug}" é reservado.` };

  const [slugRow] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (slugRow && slugRow.id !== id) return { ok: false, error: `O subdomínio "${slug}" já está em uso.` };

  if (customDomain) {
    const [domainRow] = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.customDomain, customDomain))
      .limit(1);
    if (domainRow && domainRow.id !== id) return { ok: false, error: `O domínio "${customDomain}" já está em uso.` };
  }

  await db.update(tenants).set({ name, slug, customDomain }).where(eq(tenants.id, id));

  // Sincroniza os domínios na Vercel quando slug ou domínio próprio mudam.
  const warnings: string[] = [];
  if (slug !== current.slug) {
    const oldSub = tenantSubdomain(current.slug);
    const newSub = tenantSubdomain(slug);
    if (oldSub) await detachDomain(oldSub);
    if (newSub) {
      const r = await attachDomain(newSub);
      if (!r.ok) warnings.push(`Subdomínio ${newSub}: ${r.error}`);
    }
  }
  if (customDomain !== current.customDomain) {
    if (current.customDomain) await detachDomain(current.customDomain);
    if (customDomain) {
      const r = await attachDomain(customDomain);
      if (!r.ok) warnings.push(`Domínio ${customDomain}: ${r.error}`);
    }
  }

  revalidatePath('/super-admin');
  return { ok: true, warning: warnings.length ? warnings.join(' · ') : undefined };
}

export async function toggleTenantActive(id: string, active: boolean): Promise<void> {
  await assertSuperAdmin();
  await db.update(tenants).set({ active }).where(eq(tenants.id, id));
  revalidatePath('/super-admin');
}
