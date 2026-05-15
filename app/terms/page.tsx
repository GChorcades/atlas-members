import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users, settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import TermsClient from './terms-client';
import { DEFAULT_LGPD_TERMS } from '@/lib/lgpd-default';

export default async function TermsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const [user] = await db
    .select({ id: users.id, name: users.name, termsAcceptedAt: users.termsAcceptedAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect('/login');
  if (user.termsAcceptedAt) redirect('/dashboard');

  const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, 'lgpd_terms')).limit(1);
  const termsText = row?.value?.trim() || DEFAULT_LGPD_TERMS;

  return <TermsClient userName={user.name} termsText={termsText} />;
}
