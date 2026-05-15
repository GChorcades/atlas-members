import type { CSSProperties } from 'react';

/** Bloco shimmer básico. Usa a classe .skel de globals.css. */
export function Skel({
  w = '100%',
  h = 16,
  radius = 8,
  style,
}: {
  w?: number | string;
  h?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: radius, ...style }} />;
}

/** Linhas de texto skeleton; a última sai mais curta. */
export function SkelText({ lines = 3, gap = 8 }: { lines?: number; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skel key={i} h={12} w={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}

/** Card retangular skeleton (capa + título + linha). */
export function SkelCard({ height = 200 }: { height?: number }) {
  return (
    <div
      className="card"
      style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <Skel h={height * 0.55} radius={0} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skel h={14} w="80%" />
        <Skel h={10} w="50%" />
      </div>
    </div>
  );
}

/** Grade de cards skeleton. */
export function SkelCardGrid({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkelCard key={i} />
      ))}
    </div>
  );
}

/** Skeleton genérico de página de detalhe/editor (admin) — header + cards. */
export function DetailSkeleton() {
  return (
    <div style={{ maxWidth: 900, padding: 8, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="row gap-12" style={{ alignItems: 'center' }}>
        <Skel w={36} h={36} radius={8} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skel h={20} w={220} />
          <Skel h={11} w={300} />
        </div>
      </div>
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skel h={11} w={120} />
            <Skel h={40} />
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: 24 }}>
        <SkelText lines={4} />
      </div>
    </div>
  );
}

/** Skeleton genérico de página de conteúdo — header + faixa de stats + grade de cards. */
export function PageSkeleton() {
  return (
    <div className="content content-wide" style={{ maxWidth: 1440, padding: '24px 32px' }}>
      <Skel h={12} w={120} style={{ marginBottom: 14 }} />
      <Skel h={34} w={320} style={{ marginBottom: 28 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 36 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skel key={i} h={84} />
        ))}
      </div>
      <Skel h={20} w={220} style={{ marginBottom: 18 }} />
      <SkelCardGrid count={6} columns={3} />
    </div>
  );
}
