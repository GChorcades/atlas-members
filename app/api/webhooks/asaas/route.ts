import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, settings, payments, enrollments, tenants } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { mapAsaasStatusToOurs } from '@/lib/asaas';
import { notifyPaymentConfirmed } from '@/lib/notifications';

type AsaasEvent =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_REFUNDED'
  | 'SUBSCRIPTION_RENEWED'
  | 'SUBSCRIPTION_DELETED';

type AsaasPayload = {
  event: AsaasEvent;
  payment: {
    id: string;
    customer: string;
    value: number;
    billingType: string;
    status: string;
    subscription?: string;
    description?: string;
    externalReference?: string;
  };
};

async function getSettings(tenantId: string): Promise<Record<string, string>> {
  const rows = await db.select().from(settings).where(eq(settings.tenantId, tenantId));
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
}

async function fetchAsaasCustomer(
  customerId: string,
  apiKey: string,
  env: string,
): Promise<{ email?: string; name?: string } | null> {
  const baseUrl = env === 'production'
    ? 'https://api.asaas.com'
    : 'https://sandbox.asaas.com';

  try {
    const res = await fetch(`${baseUrl}/api/v3/customers/${customerId}`, {
      headers: { access_token: apiKey },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function determinePlan(payload: AsaasPayload): 'monthly' | 'annual' | 'lifetime' | 'free' | null {
  const ext = payload.payment.externalReference ?? '';
  // Structured checkout payment — plan is set by enrollment, not the payment event
  if (ext.startsWith('checkout:')) return null;

  const desc = (payload.payment.description ?? '').toLowerCase();
  const combined = `${desc} ${ext.toLowerCase()}`;

  if (combined.includes('vitalicio') || combined.includes('lifetime')) return 'lifetime';
  if (combined.includes('anual') || combined.includes('annual') || combined.includes('yearly')) return 'annual';
  if (combined.includes('mensal') || combined.includes('monthly')) return 'monthly';

  if (payload.payment.value >= 200) return 'annual';
  return 'monthly';
}

export async function POST(req: Request) {
  let body: AsaasPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Sem host/sessão: o tenant é derivado da cobrança referenciada pelo webhook.
  // O `asaasPaymentId` é globalmente único — usamos a linha de payment para
  // descobrir a qual tenant pertencem as configurações (settings) a usar.
  const [paymentRow] = body.payment?.id
    ? await db.select().from(payments).where(eq(payments.asaasPaymentId, body.payment.id)).limit(1)
    : [];
  const tenantId = paymentRow?.tenantId ?? null;
  const cfg = tenantId ? await getSettings(tenantId) : {};
  const webhookSecret = cfg['asaas_webhook_secret'];
  const apiKey = cfg['asaas_api_key'];
  const asaasEnv = cfg['asaas_env'] ?? 'sandbox';

  // Validate the Asaas authentication token.
  // The Asaas dashboard calls this "Token de autenticação" and sends it in the `asaas-access-token` header.
  // x-test-mode bypass is only allowed in non-production environments.
  const testMode = process.env.NODE_ENV !== 'production' && req.headers.get('x-test-mode') === '1';
  if (!webhookSecret) {
    if (!testMode) {
      console.error('[asaas-webhook] asaas_webhook_secret not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
  } else if (!testMode) {
    const token = req.headers.get('asaas-access-token') ?? '';
    if (token !== webhookSecret) {
      console.warn('[asaas-webhook] Invalid asaas-access-token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { event, payment } = body;

  console.log(`[asaas-webhook]${testMode ? ' [TEST]' : ''} ${event} | customer: ${payment?.customer} | value: ${payment?.value}`);

  // Update payment record in our DB if we have it, and enroll on confirmation
  if (payment?.id) {
    await db.update(payments)
      .set({
        status: mapAsaasStatusToOurs(payment.status ?? event.replace('PAYMENT_', '')),
        paidAt: ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event) ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(payments.asaasPaymentId, payment.id));

    if (['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event)) {
      const [row] = await db.select().from(payments).where(eq(payments.asaasPaymentId, payment.id)).limit(1);
      if (row?.courseId) {
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
          console.log(`[asaas-webhook] Enrolled user ${row.userId} in course ${row.courseId}`);
        }
      }
    }
  }

  if (!payment?.customer || !apiKey) {
    return NextResponse.json({ ok: true, note: 'skipped' });
  }

  // Fetch customer email from Asaas (or accept from payload in test mode)
  const customer = testMode && typeof (body as unknown as { customerEmail?: string }).customerEmail === 'string'
    ? { email: (body as unknown as { customerEmail: string }).customerEmail }
    : await fetchAsaasCustomer(payment.customer, apiKey, asaasEnv);
  const email = customer?.email;

  if (!email) {
    console.warn('[asaas-webhook] Could not resolve customer email for', payment.customer);
    return NextResponse.json({ ok: true, note: 'customer not resolved' });
  }

  // Sob multi-tenant o email não é globalmente único — escopamos ao tenant
  // da cobrança. Sem tenant resolvido não há como identificar o usuário com segurança.
  if (!tenantId) {
    console.warn('[asaas-webhook] No tenant resolved for payment; skipping user update');
    return NextResponse.json({ ok: true, note: 'tenant not resolved' });
  }

  const [user] = await db.select({ id: users.id, plan: users.plan, name: users.name, email: users.email, phone: users.phone })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.email, email)))
    .limit(1);

  if (!user) {
    console.warn('[asaas-webhook] No user found for email:', email);
    return NextResponse.json({ ok: true, note: 'user not found' });
  }

  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
    case 'SUBSCRIPTION_RENEWED': {
      const plan = determinePlan(body);
      if (plan !== null) {
        await db.update(users).set({ plan, updatedAt: new Date() }).where(eq(users.id, user.id));
        console.log(`[asaas-webhook] Updated ${email} → plan: ${plan}`);
      }
      if (event !== 'SUBSCRIPTION_RENEWED') {
        try {
          const [tenantRow] = await db
            .select({ id: tenants.id, name: tenants.name, slug: tenants.slug, customDomain: tenants.customDomain })
            .from(tenants)
            .where(eq(tenants.id, tenantId))
            .limit(1);
          await notifyPaymentConfirmed(
            { name: user.name, email: user.email, phone: user.phone },
            { description: payment.description ?? 'Acesso à plataforma', value: payment.value },
            tenantRow,
          );
        } catch (err) {
          console.error('[asaas-webhook] notify falhou', err);
        }
      }
      break;
    }

    case 'PAYMENT_OVERDUE': {
      // Only downgrade if not lifetime
      if (user.plan !== 'lifetime') {
        await db.update(users).set({ plan: 'free', updatedAt: new Date() }).where(eq(users.id, user.id));
        console.log(`[asaas-webhook] Downgraded ${email} → free (overdue)`);
      }
      break;
    }

    case 'PAYMENT_REFUNDED':
    case 'SUBSCRIPTION_DELETED': {
      if (user.plan !== 'lifetime') {
        await db.update(users).set({ plan: 'free', updatedAt: new Date() }).where(eq(users.id, user.id));
        console.log(`[asaas-webhook] Downgraded ${email} → free (${event})`);
      }
      break;
    }

    default:
      console.log(`[asaas-webhook] Unhandled event: ${event}`);
  }

  return NextResponse.json({ ok: true });
}
