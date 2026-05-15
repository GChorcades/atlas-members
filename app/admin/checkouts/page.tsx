import { db } from '@/db';
import { courses, checkouts, checkoutOffers, coupons } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import CheckoutsClient from './checkouts-client';

export default async function AdminCheckoutsPage() {
  const rows = await db
    .select({
      courseId: courses.id,
      title: courses.title,
      instructor: courses.instructor,
      checkoutId: checkouts.id,
      slug: checkouts.slug,
      active: checkouts.active,
      price: checkouts.price,
      headline: checkouts.headline,
      description: checkouts.description,
      allowPix: checkouts.allowPix,
      allowBoleto: checkouts.allowBoleto,
      allowCreditCard: checkouts.allowCreditCard,
      maxInstallments: checkouts.maxInstallments,
      socialProof: checkouts.socialProof,
    })
    .from(courses)
    .leftJoin(checkouts, eq(checkouts.courseId, courses.id))
    .orderBy(courses.title);

  const allOffers = await db.select().from(checkoutOffers).orderBy(asc(checkoutOffers.createdAt));
  const allCoupons = await db.select().from(coupons).orderBy(asc(coupons.createdAt));

  const offersByCheckout: Record<string, typeof allOffers> = {};
  for (const o of allOffers) (offersByCheckout[o.checkoutId] ??= []).push(o);

  const couponsByCheckout: Record<string, typeof allCoupons> = {};
  for (const c of allCoupons) (couponsByCheckout[c.checkoutId] ??= []).push(c);

  const rowsWithExtras = rows.map((r) => ({
    ...r,
    offers: r.checkoutId ? (offersByCheckout[r.checkoutId] ?? []).map((o) => ({
      id: o.id, name: o.name, slug: o.slug, price: o.price, active: o.active,
    })) : [],
    coupons: r.checkoutId ? (couponsByCheckout[r.checkoutId] ?? []).map((c) => ({
      id: c.id, code: c.code, discountType: c.discountType, discountValue: c.discountValue,
      expiresAt: c.expiresAt.toISOString(), active: c.active,
    })) : [],
  }));

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="h2">Checkouts</h2>
        <p className="muted mt-4" style={{ fontSize: 13 }}>
          Página de venda pública por curso. Cada curso pode ter um checkout em <code>/checkout/&lt;slug&gt;</code>.
        </p>
      </div>
      <CheckoutsClient rows={rowsWithExtras} />
    </div>
  );
}
