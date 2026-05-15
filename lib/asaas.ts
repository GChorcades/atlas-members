import { cache } from 'react';
import { db } from '@/db';
import { settings } from '@/db/schema';

export type AsaasBillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED';

export type AsaasCustomer = {
  id?: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  externalReference?: string;
};

export type AsaasPaymentCreate = {
  customer: string; // Asaas customer id
  billingType: AsaasBillingType;
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  totalValue?: number; // total when using installments
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone?: string;
  };
};

export type AsaasSubscriptionCreate = {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
  endDate?: string;
  maxPayments?: number;
  externalReference?: string;
};

export type AsaasPaymentResponse = {
  id: string;
  status: string;
  value: number;
  netValue: number;
  billingType: string;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  customer: string;
  description?: string;
  installment?: string;
  installmentCount?: number;
  installmentNumber?: number;
};

const getAsaasConfig = cache(async function getAsaasConfig() {
  const rows = await db.select().from(settings);
  const cfg = Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
  const apiKey = cfg['asaas_api_key'];
  const env = (cfg['asaas_env'] ?? 'sandbox') as 'sandbox' | 'production';
  if (!apiKey) throw new Error('Asaas API Key não configurada. Vá em Configurações → Pagamento.');
  const baseUrl = env === 'production' ? 'https://api.asaas.com' : 'https://sandbox.asaas.com';
  return { apiKey, env, baseUrl };
});

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiKey, baseUrl } = await getAsaasConfig();
  const res = await fetch(`${baseUrl}/api/v3${path}`, {
    ...init,
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  if (!res.ok) {
    const message = (body as { errors?: { description?: string }[] } | null)?.errors?.[0]?.description
      ?? `Asaas ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

// ─── Customers ─────────────────────────────────────────────────────────

export async function asaasCreateCustomer(data: AsaasCustomer): Promise<{ id: string } & AsaasCustomer> {
  return asaasFetch('/customers', { method: 'POST', body: JSON.stringify(data) });
}

export async function asaasUpdateCustomer(id: string, data: Partial<AsaasCustomer>): Promise<{ id: string } & AsaasCustomer> {
  return asaasFetch(`/customers/${id}`, { method: 'POST', body: JSON.stringify(data) });
}

export async function asaasGetCustomer(id: string) {
  return asaasFetch<{ id: string; name: string; email: string; cpfCnpj: string }>(`/customers/${id}`);
}

// ─── Payments ──────────────────────────────────────────────────────────

export async function asaasCreatePayment(data: AsaasPaymentCreate): Promise<AsaasPaymentResponse> {
  return asaasFetch('/payments', { method: 'POST', body: JSON.stringify(data) });
}

export async function asaasGetPayment(id: string): Promise<AsaasPaymentResponse> {
  return asaasFetch(`/payments/${id}`);
}

export async function asaasDeletePayment(id: string): Promise<{ deleted: boolean; id: string }> {
  return asaasFetch(`/payments/${id}`, { method: 'DELETE' });
}

export async function asaasGetPaymentPixQrCode(id: string): Promise<{ encodedImage: string; payload: string; expirationDate: string }> {
  return asaasFetch(`/payments/${id}/pixQrCode`);
}

export async function asaasListPaymentsByInstallment(installmentId: string): Promise<{ data: AsaasPaymentResponse[] }> {
  return asaasFetch(`/payments?installment=${installmentId}&limit=100`);
}

// ─── Subscriptions ─────────────────────────────────────────────────────

export async function asaasCreateSubscription(data: AsaasSubscriptionCreate) {
  return asaasFetch<{ id: string; status: string; value: number; nextDueDate: string; cycle: string; billingType: string }>(
    '/subscriptions',
    { method: 'POST', body: JSON.stringify(data) },
  );
}

export async function asaasCancelSubscription(id: string) {
  return asaasFetch<{ deleted: boolean; id: string }>(`/subscriptions/${id}`, { method: 'DELETE' });
}

// ─── Status mapping ────────────────────────────────────────────────────

export function mapAsaasStatusToOurs(asaasStatus: string): 'pending' | 'received' | 'confirmed' | 'overdue' | 'refunded' | 'cancelled' | 'failed' {
  const s = asaasStatus.toUpperCase();
  if (s === 'PENDING' || s === 'AWAITING_RISK_ANALYSIS') return 'pending';
  if (s === 'RECEIVED' || s === 'RECEIVED_IN_CASH') return 'received';
  if (s === 'CONFIRMED') return 'confirmed';
  if (s === 'OVERDUE') return 'overdue';
  if (s === 'REFUNDED' || s === 'CHARGEBACK_REQUESTED' || s === 'CHARGEBACK_DISPUTE') return 'refunded';
  if (s === 'DELETED' || s === 'CANCELED' || s === 'CANCELLED') return 'cancelled';
  return 'failed';
}
