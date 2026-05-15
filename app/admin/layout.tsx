import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { AppShell } from '@/components/app-shell';
import AdminNav from './nav';
import { getBrand } from '@/lib/brand';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') redirect('/dashboard');

  const [dbUser] = await db
    .select({ name: users.name, email: users.email, role: users.role, level: users.level, xp: users.xp, termsAcceptedAt: users.termsAcceptedAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!dbUser) redirect('/login');
  if (!dbUser.termsAcceptedAt) redirect('/terms');

  const brand = await getBrand();

  return (
    <AppShell user={dbUser} brand={{ name: brand.name, logoUrl: brand.logoUrl, faviconUrl: brand.faviconUrl, logoOnly: brand.logoOnly, footer: brand.footer }}>
      <div className="content content-wide" style={{ maxWidth: 1440 }}>
        <div className="eyebrow">Painel</div>
        <h1 className="h1-serif mt-8 mb-24">Admin</h1>
        <div className="admin-shell">
          <AdminNav />
          <div>{children}</div>
        </div>
      </div>
    </AppShell>
  );
}
