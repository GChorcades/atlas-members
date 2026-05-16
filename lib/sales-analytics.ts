import { and, eq, gte, isNotNull, lte, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { payments, invoices } from '@/db/schema';
import { getTenantId } from '@/lib/tenant';

export type SalesModo = 'semana' | 'mes';

export type SalesSeriePoint = { data: string; label: string; valor: number };

export type SalesAnalytics = {
  modo: SalesModo;
  ref: string;
  refAnterior: string;
  refProximo: string;
  periodoLabel: string;
  faturamento: number;
  numVendas: number;
  ticketMedio: number;
  vendasPendentes: number;
  serie: SalesSeriePoint[];
  notasAutorizadas: number;
  notasEnviadas: number;
  notasAguardando: number;
  notasErro: number;
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Formata uma data como 'YYYY-MM-DD' (componentes locais). */
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Segunda-feira da semana que contém `d` (00:00:00 local). */
function segundaFeira(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = r.getDay(); // 0=Dom .. 6=Sáb
  const diff = dow === 0 ? -6 : 1 - dow; // recua até segunda
  r.setDate(r.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Resolve o período (início/fim) a partir de modo + ref, normalizando ref. */
function resolverPeriodo(modo: SalesModo, ref: string): {
  inicio: Date;
  fim: Date;
  refNorm: string;
  refAnterior: string;
  refProximo: string;
  periodoLabel: string;
} {
  const hoje = new Date();

  if (modo === 'semana') {
    // ref esperado: YYYY-MM-DD (segunda-feira)
    let base: Date;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ref ?? '');
    if (m) {
      const cand = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      base = isNaN(cand.getTime()) ? hoje : cand;
    } else {
      base = hoje;
    }
    const inicio = segundaFeira(base);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 6);
    fim.setHours(23, 59, 59, 999);

    const ant = new Date(inicio);
    ant.setDate(ant.getDate() - 7);
    const prox = new Date(inicio);
    prox.setDate(prox.getDate() + 7);

    const periodoLabel = formatarSemana(inicio, fim);
    return {
      inicio,
      fim,
      refNorm: ymd(inicio),
      refAnterior: ymd(ant),
      refProximo: ymd(prox),
      periodoLabel,
    };
  }

  // modo === 'mes' — ref esperado: YYYY-MM
  let ano: number;
  let mes: number; // 0-based
  const m = /^(\d{4})-(\d{2})$/.exec(ref ?? '');
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) {
    ano = Number(m[1]);
    mes = Number(m[2]) - 1;
  } else {
    ano = hoje.getFullYear();
    mes = hoje.getMonth();
  }
  const inicio = new Date(ano, mes, 1, 0, 0, 0, 0);
  const fim = new Date(ano, mes + 1, 0, 23, 59, 59, 999);

  const refMes = (a: number, mz: number) => `${a}-${String(mz + 1).padStart(2, '0')}`;
  const refAnterior = mes === 0 ? refMes(ano - 1, 11) : refMes(ano, mes - 1);
  const refProximo = mes === 11 ? refMes(ano + 1, 0) : refMes(ano, mes + 1);

  return {
    inicio,
    fim,
    refNorm: refMes(ano, mes),
    refAnterior,
    refProximo,
    periodoLabel: `${MESES[mes]} de ${ano}`,
  };
}

function formatarSemana(inicio: Date, fim: Date): string {
  const di = inicio.getDate();
  const df = fim.getDate();
  if (inicio.getMonth() === fim.getMonth()) {
    return `${di}–${df} de ${MESES[inicio.getMonth()].toLowerCase()} de ${fim.getFullYear()}`;
  }
  return `${di} de ${MESES[inicio.getMonth()].toLowerCase()} – ${df} de ${MESES[fim.getMonth()].toLowerCase()} de ${fim.getFullYear()}`;
}

/** Monta a série diária do período com todos os dias preenchidos (0 quando vazio). */
function montarSerie(
  modo: SalesModo,
  inicio: Date,
  fim: Date,
  vendasPorDia: Map<string, number>,
): SalesSeriePoint[] {
  const serie: SalesSeriePoint[] = [];
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  while (cursor <= fim) {
    const key = ymd(cursor);
    serie.push({
      data: key,
      label: modo === 'semana' ? DIAS_SEMANA[cursor.getDay()] : String(cursor.getDate()),
      valor: vendasPorDia.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return serie;
}

export async function getSalesAnalytics(modo: SalesModo, ref: string): Promise<SalesAnalytics> {
  const tenantId = await getTenantId();
  const { inicio, fim, refNorm, refAnterior, refProximo, periodoLabel } = resolverPeriodo(modo, ref);

  // ── Vendas confirmadas (status received/confirmed, por paidAt no período) ──
  const confirmadas = await db
    .select({ value: payments.value, paidAt: payments.paidAt })
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        inArray(payments.status, ['received', 'confirmed']),
        isNotNull(payments.paidAt),
        gte(payments.paidAt, inicio),
        lte(payments.paidAt, fim),
      ),
    );

  const faturamento = confirmadas.reduce((acc, p) => acc + (p.value ?? 0), 0);
  const numVendas = confirmadas.length;
  const ticketMedio = numVendas > 0 ? faturamento / numVendas : 0;

  // Agrupa por dia (base: paidAt)
  const vendasPorDia = new Map<string, number>();
  for (const p of confirmadas) {
    if (!p.paidAt) continue;
    const key = ymd(new Date(p.paidAt));
    vendasPorDia.set(key, (vendasPorDia.get(key) ?? 0) + (p.value ?? 0));
  }
  const serie = montarSerie(modo, inicio, fim, vendasPorDia);

  // ── Vendas pendentes (status pending, por createdAt no período) ──
  const pendentes = await db
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.tenantId, tenantId),
        eq(payments.status, 'pending'),
        gte(payments.createdAt, inicio),
        lte(payments.createdAt, fim),
      ),
    );
  const vendasPendentes = pendentes.length;

  // ── Notas fiscais (por createdAt no período) ──
  const notas = await db
    .select({ status: invoices.status, notifiedAt: invoices.notifiedAt })
    .from(invoices)
    .where(
      and(
        eq(invoices.tenantId, tenantId),
        gte(invoices.createdAt, inicio),
        lte(invoices.createdAt, fim),
      ),
    );

  let notasAutorizadas = 0;
  let notasEnviadas = 0;
  let notasAguardando = 0;
  let notasErro = 0;
  for (const n of notas) {
    if (n.status === 'autorizada') {
      notasAutorizadas++;
      if (n.notifiedAt == null) notasAguardando++;
    }
    if (n.status === 'erro') notasErro++;
    if (n.notifiedAt != null) notasEnviadas++;
  }

  return {
    modo,
    ref: refNorm,
    refAnterior,
    refProximo,
    periodoLabel,
    faturamento,
    numVendas,
    ticketMedio,
    vendasPendentes,
    serie,
    notasAutorizadas,
    notasEnviadas,
    notasAguardando,
    notasErro,
  };
}
