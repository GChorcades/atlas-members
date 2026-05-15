import { Skel, SkelText } from '@/components/skeleton';

export default function Loading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skel h={22} w={200} />
      <Skel h={12} w={320} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 16 }}>
            <SkelText lines={2} />
          </div>
        ))}
      </div>
    </div>
  );
}
