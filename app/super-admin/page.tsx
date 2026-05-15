import { requireSuperAdmin } from '@/lib/super-admin';
import { db } from '@/db';
import { tenants, users, courses } from '@/db/schema';
import { sql } from 'drizzle-orm';
import TenantManager from './tenant-manager';

export const metadata = { title: 'Super Admin · Tenants' };

export default async function SuperAdminPage() {
  const admin = await requireSuperAdmin();

  const tenantRows = await db.select().from(tenants).orderBy(tenants.createdAt);

  const userCounts = await db
    .select({ tenantId: users.tenantId, count: sql<number>`count(*)::int` })
    .from(users)
    .groupBy(users.tenantId);
  const courseCounts = await db
    .select({ tenantId: courses.tenantId, count: sql<number>`count(*)::int` })
    .from(courses)
    .groupBy(courses.tenantId);

  const userMap = new Map(userCounts.map((r) => [r.tenantId, Number(r.count)]));
  const courseMap = new Map(courseCounts.map((r) => [r.tenantId, Number(r.count)]));

  const list = tenantRows.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    customDomain: t.customDomain,
    active: t.active,
    createdAt: t.createdAt.toISOString(),
    userCount: userMap.get(t.id) ?? 0,
    courseCount: courseMap.get(t.id) ?? 0,
  }));

  return (
    <TenantManager
      adminName={admin.name}
      tenants={list}
      platformDomain={process.env.PLATFORM_DOMAIN ?? ''}
    />
  );
}
