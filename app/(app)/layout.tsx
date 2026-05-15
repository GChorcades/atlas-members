import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { AppShell } from '@/components/app-shell';
import { getBrand } from '@/lib/brand';
import { getTenantId } from '@/lib/tenant';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenantId = await getTenantId();

  const [dbUser] = await db
    .select({ name: users.name, email: users.email, role: users.role, level: users.level, xp: users.xp, suspended: users.suspended, termsAcceptedAt: users.termsAcceptedAt })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.id, session.user.id)))
    .limit(1);

  if (!dbUser) redirect('/login');
  if (dbUser.suspended) redirect('/login');
  if (!dbUser.termsAcceptedAt) redirect('/terms');

  const brand = await getBrand();

  return (
    <AppShell user={dbUser} brand={{ name: brand.name, logoUrl: brand.logoUrl, faviconUrl: brand.faviconUrl, logoOnly: brand.logoOnly, footer: brand.footer }}>
      {children}
    </AppShell>
  );
}
