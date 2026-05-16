type BarChartProps = {
  data: { label: string; valor: number }[];
};

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Gráfico de barras em SVG puro, reutilizável e server-renderável.
 * As barras são proporcionais ao maior valor; o tooltip de valor usa
 * o elemento nativo <title> do SVG (hover do navegador).
 */
export function BarChart({ data }: BarChartProps) {
  const maxValor = Math.max(0, ...data.map((d) => d.valor));
  const count = Math.max(data.length, 1);

  // Geometria em coordenadas de viewBox.
  const W = 720;
  const H = 220;
  const padBottom = 28; // espaço para os rótulos do eixo
  const padTop = 8;
  const plotH = H - padBottom - padTop;
  const slot = W / count;
  const barW = Math.min(slot * 0.6, 48);

  return (
    <div className="bar-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Vendas ao longo do tempo"
      >
        {/* linha de base do eixo */}
        <line
          x1={0}
          y1={padTop + plotH}
          x2={W}
          y2={padTop + plotH}
          stroke="var(--text-muted)"
          strokeWidth={1}
          opacity={0.35}
        />
        {data.map((d, i) => {
          const cx = slot * i + slot / 2;
          const ratio = maxValor > 0 ? d.valor / maxValor : 0;
          // altura mínima visível para barras zeradas
          const barH = Math.max(ratio * plotH, d.valor > 0 ? 2 : 1);
          const y = padTop + plotH - barH;
          return (
            <g key={d.label + i}>
              <rect
                x={cx - barW / 2}
                y={y}
                width={barW}
                height={barH}
                rx={3}
                fill="var(--accent)"
                opacity={d.valor > 0 ? 1 : 0.25}
              >
                <title>{`${d.label}: ${BRL(d.valor)}`}</title>
              </rect>
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                fontSize={11}
                fill="var(--text-muted)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
