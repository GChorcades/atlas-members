import { db } from '@/db';
import { settings } from '@/db/schema';
import SettingsClient from './settings-client';

export default async function AdminSettingsPage() {
  const rows = await db.select().from(settings);
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));

  const bunnyConfigured = !!(
    process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID &&
    process.env.BUNNY_API_KEY &&
    process.env.BUNNY_CDN_HOSTNAME
  );

  return (
    <SettingsClient
      initial={cfg}
      bunnyEnv={{
        libraryId: process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID ?? '',
        cdnHostname: process.env.BUNNY_CDN_HOSTNAME ?? '',
        configured: bunnyConfigured,
      }}
    />
  );
}
