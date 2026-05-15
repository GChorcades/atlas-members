'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentPoller({ paymentId }: { paymentId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/checkout/payment-status?id=${paymentId}`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { paid?: boolean };
          if (data.paid && !cancelled) {
            router.refresh();
            return;
          }
        }
      } catch { /* ignore network errors */ }
      if (!cancelled) timeout = setTimeout(poll, 3000);
    }

    timeout = setTimeout(poll, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [paymentId, router]);

  return null;
}
