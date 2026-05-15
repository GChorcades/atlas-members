import { cache } from 'react';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant';

export type Brand = {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  color: string | null;
  footer: string | null;
  logoOnly: boolean;
};

const KEYS = ['brand_name', 'brand_logo', 'brand_favicon', 'brand_color', 'brand_footer', 'brand_logo_only'] as const;

export const getBrand = cache(async (): Promise<Brand> => {
  const rows = await db.select().from(settings)
    .where(and(eq(settings.tenantId, await getTenantId()), inArray(settings.key, [...KEYS])));
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    name: (map['brand_name'] || '').trim() || 'Atlas',
    logoUrl: map['brand_logo']?.trim() || null,
    faviconUrl: map['brand_favicon']?.trim() || null,
    color: map['brand_color']?.trim() || null,
    footer: map['brand_footer']?.trim() || null,
    logoOnly: map['brand_logo_only'] === '1',
  };
});
