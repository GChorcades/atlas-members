import { db } from '@/db';
import { checkouts, courses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import CheckoutScreen from './checkout-form';

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [row] = await db
    .select({
      id: checkouts.id,
      slug: checkouts.slug,
      active: checkouts.active,
      price: checkouts.price,
      headline: checkouts.headline,
      description: checkouts.description,
      allowPix: checkouts.allowPix,
      allowBoleto: checkouts.allowBoleto,
      allowCreditCard: checkouts.allowCreditCard,
      maxInstallments: checkouts.maxInstallments,
      courseId: courses.id,
      courseTitle: courses.title,
      courseSubtitle: courses.subtitle,
      instructor: courses.instructor,
      coverBg: courses.coverBg,
      coverImage: courses.coverImage,
      coverGlyph: courses.coverGlyph,
    })
    .from(checkouts)
    .innerJoin(courses, eq(courses.id, checkouts.courseId))
    .where(eq(checkouts.slug, slug))
    .limit(1);

  if (!row || !row.active) notFound();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px 48px' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto 24px' }}>
        <div
          className="card"
          style={{
            padding: 24,
            background: row.coverImage
              ? `url(${row.coverImage}) center/cover, ${row.coverBg ?? 'linear-gradient(135deg, #1a1a2e, #16213e)'}`
              : (row.coverBg ?? 'linear-gradient(135deg, #1a1a2e, #16213e)'),
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            minHeight: 120,
            position: 'relative',
          }}
        >
          {row.coverImage && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.15))' }} />
          )}
          {row.coverGlyph && !row.coverImage && <div style={{ fontSize: 44 }}>{row.coverGlyph}</div>}
          <div style={{ position: 'relative' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: 0, fontWeight: 400, letterSpacing: '-0.02em' }}>
              {row.headline ?? row.courseTitle}
            </h1>
            {row.courseSubtitle && <p style={{ opacity: 0.85, marginTop: 6, fontSize: 13 }}>{row.courseSubtitle}</p>}
            <p style={{ opacity: 0.7, marginTop: 6, fontSize: 12 }}>com {row.instructor}</p>
          </div>
        </div>
      </div>

      <CheckoutScreen
        slug={slug}
        price={row.price}
        courseTitle={row.courseTitle}
        coverGlyph={row.coverGlyph}
        coverBg={row.coverBg}
        coverImage={row.coverImage}
        allowPix={row.allowPix}
        allowBoleto={row.allowBoleto}
        allowCreditCard={row.allowCreditCard}
        maxInstallments={row.maxInstallments}
      />
    </div>
  );
}
