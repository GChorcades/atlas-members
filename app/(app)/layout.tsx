import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { AppShell } from '@/components/app-shell';
import { getBrand } from '@/lib/brand';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const [dbUser] = await db
    .select({ name: users.name, email: users.email, role: users.role, level: users.level, xp: users.xp, suspended: users.suspended })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!dbUser) redirect('/login');
  if (dbUser.suspended) redirect('/login');

  const brand = await getBrand();

  return (
    <AppShell user={dbUser} brand={{ name: brand.name, logoUrl: brand.logoUrl, footer: brand.footer }}>
      {children}
    </AppShell>
  );
}
