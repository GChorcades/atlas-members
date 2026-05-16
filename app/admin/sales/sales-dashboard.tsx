'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import type { SalesModo } from '@/lib/sales-analytics';

type Props = {
  modo: SalesModo;
  periodoLabel: string;
  refAnterior: string;
  refProximo: string;
};

export default function SalesDashboard({ modo, periodoLabel, refAnterior, refProximo }: Props) {
  const router = useRouter();

  const irPara = (m: SalesModo, r?: string) => {
    const params = new URLSearchParams({ modo: m });
    if (r) params.set('ref', r);
    router.push(`/admin/sales?${params.toString()}`);
  };

  return (
    <div className="row sales-period" style={{ justifyContent: 'space-between', gap: 12 }}>
      {/* Toggle Semana / Mês */}
      <div className="tabs" style={{ borderBottom: 'none' }}>
        <button
          type="button"
          className="tab"
          data-active={modo === 'semana'}
          onClick={() => irPara('semana')}
        >
          Semana
        </button>
        <button
          type="button"
          className="tab"
          data-active={modo === 'mes'}
          onClick={() => irPara('mes')}
        >
          Mês
        </button>
      </div>

      {/* Navegação por setas + período atual */}
      <div className="row" style={{ gap: 8 }}>
        <button
          type="button"
          className="icon-btn"
          aria-label="Período anterior"
          onClick={() => irPara(modo, refAnterior)}
        >
          <Icon name="chevron-left" size={16} />
        </button>
        <span className="sales-period-label">{periodoLabel}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label="Próximo período"
          onClick={() => irPara(modo, refProximo)}
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </div>
  );
}
