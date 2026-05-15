'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import {
  adminUpdateUser,
  adminDeleteUser,
  adminToggleUserSuspended,
  adminAddEnrollment,
  adminRemoveEnrollment,
  adminUpdateEnrollment,
  adminCreateAsaasCharge,
  adminCreateAsaasSubscription,
  adminCancelAsaasSubscription,
  adminDeleteAsaasPayment,
} from '@/lib/actions';
import ChargeModal from './charge-modal';
import SubscriptionModal from './subscription-modal';
import PasswordModal from './password-modal';
import MessageModal from './message-modal';
import { DetailSkeleton } from '@/components/skeleton';

type Enrollment = {
  courseId: string;
  courseTitle: string;
  coverBg: string | null;
  coverImage: string | null;
  coverGlyph: string | null;
  progress: number;
  active: boolean;
  enrolledAt: string;
  expiresAt: string | null;
  lastAccessAt: string;
  lessonsDone: number;
  lessonCount: number;
};

type Payment = {
  id: string;
  asaasPaymentId: string | null;
  value: number;
  netValue: number | null;
  billingType: string;
  status: string;
  description: string | null;
  invoiceUrl: string | null;
  bankSlipUrl: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  dueDate: string;
  paidAt: string | null;
};

type Subscription = {
  id: string;
  asaasSubscriptionId: string | null;
  plan: string;
  cycle: string;
  value: number;
  status: string;
  billingType: string;
  description: string | null;
  startedAt: string;
  nextDueDate: string | null;
  cancelledAt: string | null;
};

type StudentData = {
  user: {
    id: string; name: string; email: string; role: string; plan: string;
    level: number; xp: number; streak: number; phone: string | null;
    location: string | null; cpfCnpj: string | null; asaasCustomerId: string | null;
    suspended: boolean; termsAcceptedAt: string | null; createdAt: string;
  };
  stats: {
    coursesEnrolled: number;
    avgProgress: number;
    lessonsDone: number;
    totalWatchedSeconds: number;
    totalWatchedLabel: string;
  };
  cohorts: { id: string; name: string; color: string | null }[];
  enrollments: Enrollment[];
  availableCourses: { id: string; title: string; published: boolean; coverBg: string | null; coverImage: string | null; coverGlyph: string | null }[];
  payments: Payment[];
  subscriptions: Subscription[];
};

const PLAN_LABEL: Record<string, string> = { free: 'Gratuito', monthly: 'Mensal', annual: 'Anual', lifetime: 'Vitalício' };
const PLAN_OPTIONS = [
  { value: 'free', label: 'Gratuito' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'annual', label: 'Anual' },
  { value: 'lifetime', label: 'Vitalício' },
];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Aguardando', color: '#92400e' },
  received: { label: 'Recebido', color: '#166534' },
  confirmed: { label: 'Confirmado', color: '#166534' },
  overdue: { label: 'Vencido', color: '#991b1b' },
  refunded: { label: 'Reembolsado', color: '#7c3aed' },
  cancelled: { label: 'Cancelado', color: '#6b7280' },
  failed: { label: 'Falhou', color: '#991b1b' },
};

const BILLING_LABEL: Record<string, string> = {
  PIX: 'PIX',
  BOLETO: 'Boleto',
  CREDIT_CARD: 'Cartão de crédito',
  UNDEFINED: '—',
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateInput(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

function fmtMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  const ms = new Date(d).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<StudentData | null>(null);
  const [tab, setTab] = useState<'courses' | 'payments' | 'personal'>('courses');
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showCharge, setShowCharge] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [addCourseSearch, setAddCourseSearch] = useState('');

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/students/${params.id}`);
    const d = await res.json();
    setData(d);
  }, [params.id]);

  useEffect(() => { refresh(); }, [refresh]);

  function close() { router.back(); }

  async function handleToggleSuspended() {
    if (!data) return;
    const next = !data.user.suspended;
    if (next && !confirm(`Suspender o acesso de ${data.user.name}? Ele(a) perderá acesso aos cursos.`)) return;
    await adminToggleUserSuspended(data.user.id, next);
    refresh();
  }

  async function handleDelete() {
    if (!data) return;
    if (!confirm(`Excluir DEFINITIVAMENTE ${data.user.name}? Todos os dados serão removidos (matrículas, progresso, comentários, pagamentos).`)) return;
    if (!confirm(`Tem certeza? Esta ação não pode ser desfeita.`)) return;
    await adminDeleteUser(data.user.id);
    router.push('/admin/students');
  }

  async function handleInlineUpdate(field: 'name' | 'email' | 'plan' | 'cpfCnpj' | 'phone' | 'location', value: string) {
    if (!data) return;
    await adminUpdateUser(data.user.id, { [field]: value });
    refresh();
  }

  async function handleAddCourse(courseId: string) {
    if (!data) return;
    await adminAddEnrollment(data.user.id, courseId);
    refresh();
    setShowAddCourse(false);
    setAddCourseSearch('');
  }

  async function handleRemoveCourse(courseId: string, title: string) {
    if (!data) return;
    if (!confirm(`Remover matrícula em "${title}"?`)) return;
    await adminRemoveEnrollment(data.user.id, courseId);
    refresh();
  }

  async function handleToggleEnrollmentActive(courseId: string, current: boolean) {
    if (!data) return;
    await adminUpdateEnrollment(data.user.id, courseId, { active: !current });
    refresh();
  }

  async function handleUpdateExpires(courseId: string, dateStr: string) {
    if (!data) return;
    const expiresAt = dateStr ? new Date(dateStr) : null;
    await adminUpdateEnrollment(data.user.id, courseId, { expiresAt });
    refresh();
  }

  if (!data) return <DetailSkeleton />;

  const { user, stats, cohorts, enrollments, availableCourses, payments, subscriptions } = data;
  const suspended = user.suspended;
  const status = suspended ? 'Suspenso' : 'Ativo';
  const statusColor = suspended ? '#ef4444' : '#22c55e';

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Top action bar */}
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <button className="btn btn-ghost" onClick={close}>
          <Icon name="arrow-left" size={14} /> Voltar para alunos
        </button>
        <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => setShowMessage(true)}>
            <Icon name="chat" size={13} /> Enviar mensagem
          </button>
          <button
            className="btn btn-ghost"
            style={{ color: suspended ? '#22c55e' : '#f97316' }}
            onClick={handleToggleSuspended}
          >
            {suspended ? 'Reativar acesso' : 'Suspender acesso'}
          </button>
          <button className="btn btn-ghost" onClick={() => setShowPassword(true)}>
            Redefinir senha
          </button>
          <button className="btn btn-ghost" style={{ color: 'var(--danger)' }} onClick={handleDelete}>
            <Icon name="trash" size={13} /> Excluir aluno
          </button>
        </div>
      </div>

      {/* Resumo card */}
      <div className="card" style={{ padding: 28, marginBottom: 24 }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 20, marginBottom: 24 }}>
          <div className="avatar" style={{ width: 64, height: 64, fontSize: 22, flexShrink: 0, background: user.role === 'admin' ? 'var(--accent)' : 'var(--bg-muted)', color: user.role === 'admin' ? 'var(--accent-fg)' : 'var(--text)' }}>
            {user.name[0]}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="muted" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Perfil do aluno</p>
            <InlineEditableTitle
              value={user.name}
              onSave={(v) => handleInlineUpdate('name', v)}
            />
            <div className="row gap-12 muted" style={{ fontSize: 13, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
              <InlineEditableText value={user.email} onSave={(v) => handleInlineUpdate('email', v)} type="email" />
              <span style={{ opacity: 0.4 }}>•</span>
              <InlineEditableText value={user.phone ?? ''} placeholder="+ telefone" onSave={(v) => handleInlineUpdate('phone', v)} />
              <span style={{ opacity: 0.4 }}>•</span>
              <InlineEditableText value={user.location ?? ''} placeholder="+ localização" onSave={(v) => handleInlineUpdate('location', v)} />
              <span style={{ opacity: 0.4 }}>•</span>
              <InlineEditableText value={user.cpfCnpj ?? ''} placeholder="+ CPF/CNPJ" onSave={(v) => handleInlineUpdate('cpfCnpj', v)} mono />
            </div>
            {cohorts.length > 0 && (
              <div className="row gap-6" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                {cohorts.map((c) => (
                  <Link key={c.id} href={`/admin/cohorts/${c.id}`} className="chip" style={{ fontSize: 11, background: c.color ?? 'var(--accent-soft)', color: '#fff' }}>
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="row" style={{ gap: 32, flexShrink: 0 }}>
            <div>
              <p className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Plano</p>
              <InlineEditableSelect
                value={user.plan}
                options={PLAN_OPTIONS}
                onSave={(v) => handleInlineUpdate('plan', v)}
              />
            </div>
            <div>
              <p className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Cadastro</p>
              <p style={{ fontSize: 18, fontWeight: 600 }}>{fmtDate(user.createdAt)}</p>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 11, marginBottom: 4 }}>Status</p>
              <div className="row gap-6" style={{ alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
                <p style={{ fontSize: 18, fontWeight: 600 }}>{status}</p>
              </div>
            </div>
            <div>
              <p className="muted" style={{ fontSize: 11, marginBottom: 4 }}>LGPD</p>
              <div className="row gap-6" style={{ alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: user.termsAcceptedAt ? '#22c55e' : '#f97316' }} />
                <p style={{ fontSize: 18, fontWeight: 600 }}>{user.termsAcceptedAt ? 'Aceito' : 'Pendente'}</p>
              </div>
              {user.termsAcceptedAt && (
                <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>em {fmtDate(user.termsAcceptedAt)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
          <Stat value={String(stats.coursesEnrolled)} label="cursos liberados" />
          <Stat value={`${Math.round(stats.avgProgress * 100)}%`} label="progresso médio" />
          <Stat value={String(stats.lessonsDone)} label="aulas concluídas" />
          <Stat value={stats.totalWatchedLabel} label="tempo total" />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        <button type="button" className="tab" data-active={tab === 'courses'} onClick={() => setTab('courses')}>
          Cursos inscritos ({enrollments.length})
        </button>
        <button type="button" className="tab" data-active={tab === 'payments'} onClick={() => setTab('payments')}>
          Pagamentos ({payments.length})
        </button>
        <button type="button" className="tab" data-active={tab === 'personal'} onClick={() => setTab('personal')}>
          Dados pessoais
        </button>
      </div>

      {tab === 'courses' && (
        <CoursesSection
          enrollments={enrollments}
          availableCourses={availableCourses}
          showAddCourse={showAddCourse}
          setShowAddCourse={setShowAddCourse}
          addCourseSearch={addCourseSearch}
          setAddCourseSearch={setAddCourseSearch}
          onAddCourse={handleAddCourse}
          onRemoveCourse={handleRemoveCourse}
          onToggleActive={handleToggleEnrollmentActive}
          onUpdateExpires={handleUpdateExpires}
        />
      )}

      {tab === 'payments' && (
        <PaymentsSection
          user={user}
          payments={payments}
          subscriptions={subscriptions}
          onNewCharge={() => setShowCharge(true)}
          onNewSubscription={() => setShowSub(true)}
          onCancelSubscription={async (id) => {
            if (!confirm('Cancelar esta assinatura?')) return;
            await adminCancelAsaasSubscription(id);
            refresh();
          }}
          onDeletePayment={async (id) => {
            if (!confirm('Cancelar/excluir esta cobrança?')) return;
            await adminDeleteAsaasPayment(id);
            refresh();
          }}
        />
      )}

      {tab === 'personal' && (
        <PersonalSection user={user} onSaved={refresh} close={close} />
      )}

      {showCharge && (
        <ChargeModal
          userId={user.id}
          userHasCpfCnpj={!!user.cpfCnpj}
          courses={enrollments.map((e) => ({ id: e.courseId, title: e.courseTitle }))}
          onClose={() => setShowCharge(false)}
          onSubmitted={() => { setShowCharge(false); refresh(); }}
          onCreate={(args) => adminCreateAsaasCharge(user.id, args)}
        />
      )}

      {showSub && (
        <SubscriptionModal
          userId={user.id}
          userHasCpfCnpj={!!user.cpfCnpj}
          onClose={() => setShowSub(false)}
          onSubmitted={() => { setShowSub(false); refresh(); }}
          onCreate={(args) => adminCreateAsaasSubscription(user.id, args)}
        />
      )}

      {showPassword && (
        <PasswordModal
          userId={user.id}
          userName={user.name}
          onClose={() => setShowPassword(false)}
        />
      )}

      {showMessage && (
        <MessageModal
          userId={user.id}
          userName={user.name}
          userEmail={user.email}
          userPhone={user.phone}
          onClose={() => setShowMessage(false)}
        />
      )}
    </div>
  );
}

// ─── Inline edit primitives ─────────────────────────────────────────

function InlineEditableTitle({ value, onSave }: { value: string; onSave: (v: string) => void | Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  async function commit() {
    setEditing(false);
    if (val.trim() && val !== value) await onSave(val.trim());
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setVal(value); setEditing(false); }
        }}
        style={{
          fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em',
          background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent)',
          padding: '0 4px', outline: 'none', color: 'var(--text)', width: '100%',
        }}
      />
    );
  }

  return (
    <h1
      onClick={() => setEditing(true)}
      style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', cursor: 'text', marginBottom: 0 }}
    >
      {value}
    </h1>
  );
}

function InlineEditableText({ value, onSave, placeholder, type = 'text', mono = false }: { value: string; onSave: (v: string) => void | Promise<void>; placeholder?: string; type?: string; mono?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);

  async function commit() {
    setEditing(false);
    if (val !== value) await onSave(val);
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setVal(value); setEditing(false); }
        }}
        style={{
          background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 4,
          padding: '2px 6px', outline: 'none', fontSize: 13, color: 'var(--text)',
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{ cursor: 'text', borderBottom: '1px dotted transparent', transition: 'border-color 0.15s', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = 'var(--border)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderBottomColor = 'transparent')}
    >
      {value || <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>{placeholder}</span>}
    </span>
  );
}

function InlineEditableSelect({ value, options, onSave }: { value: string; options: { value: string; label: string }[]; onSave: (v: string) => void | Promise<void> }) {
  return (
    <select
      value={value}
      onChange={async (e) => { await onSave(e.target.value); }}
      style={{
        fontSize: 18, fontWeight: 600, background: 'transparent', border: 'none',
        cursor: 'pointer', padding: 0, color: 'var(--text)', appearance: 'none',
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Stat block ─────────────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 6 }}>{value}</p>
      <p className="muted" style={{ fontSize: 13 }}>{label}</p>
    </div>
  );
}

// ─── Cursos inscritos ───────────────────────────────────────────────

function CoursesSection({
  enrollments,
  availableCourses,
  showAddCourse,
  setShowAddCourse,
  addCourseSearch,
  setAddCourseSearch,
  onAddCourse,
  onRemoveCourse,
  onToggleActive,
  onUpdateExpires,
}: {
  enrollments: Enrollment[];
  availableCourses: { id: string; title: string; published: boolean; coverBg: string | null; coverImage: string | null; coverGlyph: string | null }[];
  showAddCourse: boolean;
  setShowAddCourse: (v: boolean) => void;
  addCourseSearch: string;
  setAddCourseSearch: (v: string) => void;
  onAddCourse: (id: string) => void;
  onRemoveCourse: (id: string, title: string) => void;
  onToggleActive: (id: string, current: boolean) => void;
  onUpdateExpires: (id: string, dateStr: string) => void;
}) {
  const filtered = availableCourses.filter((c) =>
    !addCourseSearch || c.title.toLowerCase().includes(addCourseSearch.toLowerCase())
  );

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Cursos inscritos</h2>
        <button className="btn btn-accent btn-sm" onClick={() => setShowAddCourse(true)}>
          <Icon name="plus" size={13} /> Adicionar curso
        </button>
      </div>

      {enrollments.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <Icon name="courses" size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 12px' }} />
          <p className="muted" style={{ fontSize: 13 }}>Nenhum curso matriculado.</p>
        </div>
      ) : (
        <div className="col gap-12">
          {enrollments.map((enr) => {
            const expDays = daysUntil(enr.expiresAt);
            const expired = expDays !== null && expDays < 0;
            const expiringSoon = expDays !== null && expDays >= 0 && expDays <= 30;
            const inactive = !enr.active || expired;

            return (
              <div key={enr.courseId} className="card" style={{ padding: 18, opacity: inactive ? 0.7 : 1 }}>
                <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 10, flexShrink: 0, background: enr.coverImage ? `url(${enr.coverImage}) center/cover` : (enr.coverBg ?? '#1e1b4b'), display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-display)', fontSize: 18 }}>
                    {!enr.coverImage && enr.coverGlyph}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <Link href={`/admin/courses/${enr.courseId}/edit`} style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', textDecoration: 'none' }}>
                        {enr.courseTitle}
                      </Link>
                      <div className="row gap-6">
                        {expired ? (
                          <span className="chip" style={{ fontSize: 10.5, background: '#fee2e2', color: '#991b1b' }}>Expirado</span>
                        ) : enr.active ? (
                          expiringSoon ? (
                            <span className="chip" style={{ fontSize: 10.5, background: '#fef3c7', color: '#92400e' }}>{expDays} dias</span>
                          ) : (
                            <span className="chip chip-success" style={{ fontSize: 10.5 }}>● Ativo</span>
                          )
                        ) : (
                          <span className="chip" style={{ fontSize: 10.5, background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>Inativo</span>
                        )}
                      </div>
                    </div>

                    <div className="row gap-8" style={{ alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)' }}>
                        <div style={{ width: `${Math.round(enr.progress * 100)}%`, height: '100%', borderRadius: 2, background: 'var(--accent)' }} />
                      </div>
                      <span className="muted mono" style={{ fontSize: 11, minWidth: 70, textAlign: 'right' }}>
                        {Math.round(enr.progress * 100)}% · {enr.lessonsDone}/{enr.lessonCount}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr) auto', gap: 16, alignItems: 'end' }}>
                      <div>
                        <p className="muted" style={{ fontSize: 10.5, letterSpacing: '0.04em', marginBottom: 3 }}>INSCRITO EM</p>
                        <p style={{ fontSize: 12.5, fontWeight: 500 }}>{fmtDate(enr.enrolledAt)}</p>
                      </div>
                      <div>
                        <p className="muted" style={{ fontSize: 10.5, letterSpacing: '0.04em', marginBottom: 3 }}>EXPIRA EM</p>
                        <input
                          type="date"
                          value={fmtDateInput(enr.expiresAt)}
                          onChange={(e) => onUpdateExpires(enr.courseId, e.target.value)}
                          className="input-field"
                          style={{ fontSize: 12.5, padding: '4px 8px', height: 28 }}
                        />
                      </div>
                      <div>
                        <p className="muted" style={{ fontSize: 10.5, letterSpacing: '0.04em', marginBottom: 3 }}>ÚLTIMO ACESSO</p>
                        <p style={{ fontSize: 12.5, fontWeight: 500 }}>{fmtDate(enr.lastAccessAt)}</p>
                      </div>
                      <div className="row gap-4">
                        <button className="icon-btn" title={enr.active ? 'Desativar acesso a este curso' : 'Reativar acesso'} onClick={() => onToggleActive(enr.courseId, enr.active)}>
                          <Icon name={enr.active ? 'eye' : 'pause'} size={14} />
                        </button>
                        <button className="icon-btn" title="Remover matrícula" style={{ color: 'var(--danger)' }} onClick={() => onRemoveCourse(enr.courseId, enr.courseTitle)}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'grid', placeItems: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddCourse(false); }}>
          <div className="card" style={{ width: '100%', maxWidth: 540, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Matricular em curso</h3>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Icon name="search" size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input autoFocus className="input-field" value={addCourseSearch} onChange={(e) => setAddCourseSearch(e.target.value)} placeholder="Buscar curso…" style={{ paddingLeft: 33 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
                {filtered.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13, padding: 16, textAlign: 'center' }}>
                    {availableCourses.length === 0 ? 'O aluno já está matriculado em todos os cursos disponíveis.' : 'Nenhum curso encontrado.'}
                  </p>
                ) : (
                  filtered.map((c) => (
                    <button key={c.id} type="button" onClick={() => onAddCourse(c.id)} className="row gap-12"
                      style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', textAlign: 'left', alignItems: 'center', width: '100%' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: c.coverImage ? `url(${c.coverImage}) center/cover` : (c.coverBg ?? '#1e1b4b'), display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font-display)', fontSize: 13 }}>
                        {!c.coverImage && c.coverGlyph}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500 }}>{c.title}</p>
                        {!c.published && <p className="muted" style={{ fontSize: 11 }}>Rascunho</p>}
                      </div>
                      <Icon name="plus" size={14} style={{ color: 'var(--accent)' }} />
                    </button>
                  ))
                )}
              </div>
            </div>
            <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg-muted)', textAlign: 'right' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddCourse(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pagamentos ─────────────────────────────────────────────────────

function PaymentsSection({
  user,
  payments,
  subscriptions,
  onNewCharge,
  onNewSubscription,
  onCancelSubscription,
  onDeletePayment,
}: {
  user: StudentData['user'];
  payments: Payment[];
  subscriptions: Subscription[];
  onNewCharge: () => void;
  onNewSubscription: () => void;
  onCancelSubscription: (id: string) => void;
  onDeletePayment: (id: string) => void;
}) {
  const activeSubscription = subscriptions.find((s) => s.status === 'active');

  return (
    <div className="col gap-20">
      {!user.cpfCnpj && (
        <div style={{ padding: '12px 16px', borderRadius: 9, background: '#fef3c7', border: '1px solid #f59e0b', fontSize: 13, color: '#92400e' }}>
          ⚠️ Para criar cobranças no Asaas é necessário cadastrar o <strong>CPF/CNPJ</strong> do aluno. Clique no campo CPF/CNPJ no perfil acima.
        </div>
      )}

      <div className="row gap-12" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Pagamentos e assinaturas</h2>
        <div className="row gap-8">
          <button className="btn btn-soft" onClick={onNewSubscription} disabled={!user.cpfCnpj}>
            <Icon name="plus" size={13} /> Nova assinatura
          </button>
          <button className="btn btn-accent" onClick={onNewCharge} disabled={!user.cpfCnpj}>
            <Icon name="plus" size={13} /> Nova cobrança
          </button>
        </div>
      </div>

      {/* Active subscription */}
      {activeSubscription && (
        <div className="card" style={{ padding: 18, border: '1.5px solid var(--accent)', background: 'var(--accent-soft)' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14 }}>
                Assinatura ativa · {PLAN_LABEL[activeSubscription.plan]}
              </p>
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {fmtMoney(activeSubscription.value)} · {BILLING_LABEL[activeSubscription.billingType]} · próx. vencimento {fmtDate(activeSubscription.nextDueDate)}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onCancelSubscription(activeSubscription.id)}>
              Cancelar assinatura
            </button>
          </div>
        </div>
      )}

      {/* Payments list */}
      <div className="card-flat">
        {payments.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Icon name="certificate" size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 12px' }} />
            <p className="muted" style={{ fontSize: 13 }}>Nenhuma cobrança ainda.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Método</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const statusInfo = STATUS_LABEL[p.status] ?? { label: p.status, color: '#6b7280' };
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{p.description ?? '—'}</div>
                      {p.installmentCount && p.installmentNumber && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          Parcela {p.installmentNumber}/{p.installmentCount}
                        </div>
                      )}
                    </td>
                    <td className="mono">{fmtMoney(p.value)}</td>
                    <td className="muted">{BILLING_LABEL[p.billingType] ?? p.billingType}</td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{fmtDate(p.dueDate)}</td>
                    <td>
                      <span className="chip" style={{ fontSize: 11, color: statusInfo.color, background: statusInfo.color + '20', borderColor: statusInfo.color + '40' }}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td>
                      <div className="row gap-2">
                        {p.invoiceUrl && (
                          <a className="icon-btn" href={p.invoiceUrl} target="_blank" rel="noopener" title="Ver fatura no Asaas">
                            <Icon name="eye" size={13} />
                          </a>
                        )}
                        {p.status === 'pending' && (
                          <button className="icon-btn" style={{ color: 'var(--danger)' }} title="Cancelar cobrança" onClick={() => onDeletePayment(p.id)}>
                            <Icon name="x" size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Dados pessoais ─────────────────────────────────────────────────

function PersonalSection({ user, onSaved, close }: { user: StudentData['user']; onSaved: () => void; close: () => void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await adminUpdateUser(user.id, {
      name: fd.get('name') as string,
      email: fd.get('email') as string,
      role: fd.get('role') as 'admin' | 'student',
      plan: fd.get('plan') as 'free' | 'monthly' | 'annual' | 'lifetime',
      level: Number(fd.get('level')),
      xp: Number(fd.get('xp')),
      streak: Number(fd.get('streak')),
      phone: (fd.get('phone') as string) || undefined,
      location: (fd.get('location') as string) || undefined,
      cpfCnpj: (fd.get('cpfCnpj') as string) || undefined,
    });
    setSaving(false);
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Identificação</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field-group">
            <label className="field-label">Nome *</label>
            <input name="name" required className="input-field" defaultValue={user.name} />
          </div>
          <div className="field-group">
            <label className="field-label">E-mail *</label>
            <input name="email" type="email" required className="input-field" defaultValue={user.email} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="field-group">
            <label className="field-label">CPF/CNPJ</label>
            <input name="cpfCnpj" className="input-field" defaultValue={user.cpfCnpj ?? ''} placeholder="000.000.000-00" style={{ fontFamily: 'var(--font-mono)' }} />
          </div>
          <div className="field-group">
            <label className="field-label">Telefone</label>
            <input name="phone" className="input-field" defaultValue={user.phone ?? ''} placeholder="+55 11 99999-9999" />
          </div>
          <div className="field-group">
            <label className="field-label">Localização</label>
            <input name="location" className="input-field" defaultValue={user.location ?? ''} placeholder="São Paulo, SP" />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Plano e acesso</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="field-group">
            <label className="field-label">Plano</label>
            <select name="plan" className="input-field" defaultValue={user.plan}>
              {PLAN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Função</label>
            <select name="role" className="input-field" defaultValue={user.role}>
              <option value="student">Aluno</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Gamificação</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="field-group">
            <label className="field-label">Nível</label>
            <input name="level" type="number" min={1} className="input-field" defaultValue={user.level} />
          </div>
          <div className="field-group">
            <label className="field-label">XP total</label>
            <input name="xp" type="number" min={0} className="input-field" defaultValue={user.xp} />
          </div>
          <div className="field-group">
            <label className="field-label">Streak (dias)</label>
            <input name="streak" type="number" min={0} className="input-field" defaultValue={user.streak} />
          </div>
        </div>
      </div>

      <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={close}>Cancelar</button>
        <button type="submit" disabled={saving} className="btn btn-accent">
          {saved ? <><Icon name="check" size={14} /> Salvo!</> : saving ? 'Salvando…' : <><Icon name="check" size={14} /> Salvar alterações</>}
        </button>
      </div>
    </form>
  );
}
