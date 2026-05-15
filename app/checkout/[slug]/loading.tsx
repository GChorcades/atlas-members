import { Skel, SkelText } from '@/components/skeleton';

export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 16px 48px' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto 24px' }}>
        <Skel h={120} radius={12} />
      </div>
      <div
        className="card checkout-form"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          maxWidth: 1060,
          margin: '0 auto',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skel h={15} w={180} />
              <Skel h={42} />
              {i === 0 && <Skel h={42} />}
            </div>
          ))}
          <Skel h={48} radius={10} />
        </div>
        <div style={{ background: 'var(--surface-2, rgba(0,0,0,0.03))', padding: '32px 28px', borderLeft: '1px solid var(--border)' }}>
          <Skel h={56} radius={8} style={{ marginBottom: 24 }} />
          <SkelText lines={4} />
        </div>
      </div>
    </div>
  );
}
