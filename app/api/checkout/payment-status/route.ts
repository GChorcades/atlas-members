import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { payments, enrollments } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { asaasGetPayment, mapAsaasStatusToOurs } from '@/lib/asaas';

function isPaid(status: string) {
  return status === 'received' || status === 'confirmed';
}

export async function GET(req: Request) {
  const session = await auth();

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const [row] = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // If the caller is authenticated, verify ownership — unauthenticated callers are
  // the checkout success page polling before the user has logged in.
  if (session?.user && row.userId !== session.user.id && session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If already paid locally, just return
  if (isPaid(row.status)) {
    return NextResponse.json({ status: row.status, paid: true });
  }

  // Fallback: ask Asaas directly in case the webhook is delayed/missed
  if (row.asaasPaymentId) {
    try {
      const remote = await asaasGetPayment(row.asaasPaymentId);
      const newStatus = mapAsaasStatusToOurs(remote.status);
      if (newStatus !== row.status) {
        await db.update(payments)
          .set({
            status: newStatus,
            paidAt: isPaid(newStatus) ? new Date() : row.paidAt,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, row.id));

        if (isPaid(newStatus) && row.courseId) {
          const existing = await db.select().from(enrollments)
            .where(and(eq(enrollments.tenantId, row.tenantId), eq(enrollments.userId, row.userId), eq(enrollments.courseId, row.courseId)))
            .limit(1);
          if (!existing.length) {
            await db.insert(enrollments).values({
              id: nanoid(),
              tenantId: row.tenantId,
              userId: row.userId,
              courseId: row.courseId,
              active: true,
            });
          }
        }

        return NextResponse.json({ status: newStatus, paid: isPaid(newStatus), source: 'asaas' });
      }
    } catch (err) {
      console.warn('[payment-status] Asaas check failed:', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ status: row.status, paid: false });
}
