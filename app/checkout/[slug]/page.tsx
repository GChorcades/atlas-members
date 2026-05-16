import { db } from '@/db';
import { checkouts, checkoutOffers, courses } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import CheckoutScreen from './checkout-form';
import SocialProofToaster from './social-proof-toaster';
import { getTenantId } from '@/lib/tenant';

export const maxDuration = 60;

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenantId = await getTenantId();

  // O slug pode ser de um checkout ou de uma oferta (preço alternativo).
  const [offer] = await db.select().from(checkoutOffers)
    .where(and(eq(checkoutOffers.tenantId, tenantId), eq(checkoutOffers.slug, slug))).limit(1);

  const checkoutId = offer ? offer.checkoutId : null;
  const [co] = checkoutId
    ? await db.select().from(checkouts).where(and(eq(checkouts.tenantId, tenantId), eq(checkouts.id, checkoutId))).limit(1)
    : await db.select().from(checkouts).where(and(eq(checkouts.tenantId, tenantId), eq(checkouts.slug, slug))).limit(1);

  if (!co || !co.active) notFound();
  if (offer && !offer.active) notFound();

  const [course] = await db.select().from(courses)
    .where(and(eq(courses.tenantId, tenantId), eq(courses.id, co.courseId))).limit(1);
  if (!course) notFound();

  const effectivePrice = offer ? offer.price : co.price;
  const headline = offer ? offer.name : (co.headline ?? course.title);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px 48px' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto 24px' }}>
        <div
          className="card"
          style={{
            padding: 24,
            background: course.coverImage
              ? `url(${course.coverImage}) center/cover, ${course.coverBg ?? 'linear-gradient(135deg, #1a1a2e, #16213e)'}`
              : (course.coverBg ?? 'linear-gradient(135deg, #1a1a2e, #16213e)'),
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            minHeight: 120,
            position: 'relative',
          }}
        >
          {course.coverImage && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15))' }} />
          )}
          {course.coverGlyph && !course.coverImage && <div style={{ fontSize: 44 }}>{course.coverGlyph}</div>}
          <div style={{ position: 'relative' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: 0, fontWeight: 400, letterSpacing: '-0.02em' }}>
              {headline}
            </h1>
            {course.subtitle && <p style={{ opacity: 0.85, marginTop: 6, fontSize: 13 }}>{course.subtitle}</p>}
            <p style={{ opacity: 0.7, marginTop: 6, fontSize: 12 }}>com {course.instructor}</p>
          </div>
        </div>
      </div>

      <CheckoutScreen
        slug={slug}
        price={effectivePrice}
        courseTitle={course.title}
        coverGlyph={course.coverGlyph}
        coverBg={course.coverBg}
        coverImage={course.coverImage}
        allowPix={co.allowPix}
        allowBoleto={co.allowBoleto}
        allowCreditCard={co.allowCreditCard}
        maxInstallments={co.maxInstallments}
      />

      {co.socialProof && <SocialProofToaster courseTitle={course.title} />}
    </div>
  );
}
