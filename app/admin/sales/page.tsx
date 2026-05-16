import Link from 'next/link';
import { getSalesAnalytics, type SalesModo } from '@/lib/sales-analytics';
import { BarChart } from '@/components/bar-chart';
import { Icon } from '@/components/icons';
import SalesDashboard from './sales-dashboard';

type SearchParams = Promise<{ modo?: string; ref?: string }>;

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const modo: SalesModo = sp.modo === 'semana' ? 'semana' : 'mes';
  const ref = sp.ref ?? '';

  const a = await getSalesAnalytics(modo, ref);

  const indicadores = [
    { label: 'faturamento', valor: BRL(a.faturamento) },
    { label: 'nº de vendas', valor: String(a.numVendas) },
    { label: 'ticket médio', valor: BRL(a.ticketMedio) },
    { label: 'vendas pendentes', valor: String(a.vendasPendentes) },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 className="h2">Vendas</h2>
        <p className="muted mt-4" style={{ fontSize: 13 }}>
          Faturamento, vendas e notas fiscais do período.
        </p>
      </div>

      <SalesDashboard
        modo={a.modo}
        periodoLabel={a.periodoLabel}
        refAnterior={a.refAnterior}
        refProximo={a.refProximo}
      />

      {/* Indicadores */}
      <div className="sales-stat-grid mt-16">
        {indicadores.map((ind) => (
          <div key={ind.label} className="card">
            <div className="stat-num">{ind.valor}</div>
            <div className="stat-label">{ind.label}</div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      <div className="card mt-24">
        <h3 className="h3">Vendas ao longo do tempo</h3>
        <p className="muted mt-4" style={{ fontSize: 12.5 }}>
          {a.modo === 'semana' ? 'Faturamento por dia da semana' : 'Faturamento por dia do mês'}
        </p>
        <div className="mt-16">
          <BarChart data={a.serie} />
        </div>
      </div>

      {/* Notas fiscais */}
      <h3 className="h3 mt-24">Notas fiscais</h3>
      <div className="sales-stat-grid mt-12">
        <div className="card">
          <div className="stat-num">{a.notasAutorizadas}</div>
          <div className="stat-label">autorizadas</div>
        </div>
        <div className="card">
          <div className="stat-num">{a.notasEnviadas}</div>
          <div className="stat-label">enviadas</div>
        </div>
        <NotaCard
          valor={a.notasAguardando}
          label="aguardando envio"
          tone="warning"
        />
        <NotaCard valor={a.notasErro} label="com erro" tone="danger" />
      </div>
    </div>
  );
}

function NotaCard({
  valor,
  label,
  tone,
}: {
  valor: number;
  label: string;
  tone: 'warning' | 'danger';
}) {
  const destaque = valor > 0;
  const conteudo = (
    <>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="stat-num">{valor}</div>
        {destaque && (
          <span className={`sales-nota-flag sales-nota-flag-${tone}`}>
            <Icon name="arrow-right" size={14} />
          </span>
        )}
      </div>
      <div className="stat-label">{label}</div>
    </>
  );

  if (destaque) {
    return (
      <Link
        href="/admin/fiscal"
        className={`card sales-nota-card sales-nota-card-${tone}`}
      >
        {conteudo}
      </Link>
    );
  }
  return <div className="card">{conteudo}</div>;
}
