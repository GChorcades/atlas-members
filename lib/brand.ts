import { cache } from 'react';
import { db } from '@/db';
import { settings } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export type Brand = {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  color: string | null;
  footer: string | null;
};

const KEYS = ['brand_name', 'brand_logo', 'brand_favicon', 'brand_color', 'brand_footer'] as const;

export const getBrand = cache(async (): Promise<Brand> => {
  const rows = await db.select().from(settings).where(inArray(settings.key, [...KEYS]));
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    name: (map['brand_name'] || '').trim() || 'Atlas',
    logoUrl: map['brand_logo']?.trim() || null,
    faviconUrl: map['brand_favicon']?.trim() || null,
    color: map['brand_color']?.trim() || null,
    footer: map['brand_footer']?.trim() || null,
  };
});
