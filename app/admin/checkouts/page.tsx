import { db } from '@/db';
import { courses, checkouts } from '@/db/schema';
import { eq } from 'drizzle-orm';
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
    })
    .from(courses)
    .leftJoin(checkouts, eq(checkouts.courseId, courses.id))
    .orderBy(courses.title);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="h2">Checkouts</h2>
        <p className="muted mt-4" style={{ fontSize: 13 }}>
          Página de venda pública por curso. Cada curso pode ter um checkout em <code>/checkout/&lt;slug&gt;</code>.
        </p>
      </div>
      <CheckoutsClient rows={rows} />
    </div>
  );
}
