'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { saveFiscalConfig, retryInvoicePdf, cancelInvoiceManual, dispatchPendingInvoices } from '@/lib/fiscal-actions';
import type { getFiscalConfigForUI } from '@/lib/fiscal-config';

type FiscalConfigUI = Awaited<ReturnType<typeof getFiscalConfigForUI>>;

type InvoiceRow = {
  id: string;
  status: 'pendente' | 'autorizada' | 'erro' | 'cancelada';
  numero: string | null;
  valor: number;
  pdfUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  paymentId: string | null;
  notifiedAt: string | null;
  buyerName: string | null;
  buyerCpf: string | null;
};

function SectionCard({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-muted)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name={icon} size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{title}</div>
          <div className="muted" style={{ fontSize: 12 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginTop: 4, marginBottom: 14 }}>
      {children}
    </div>
  );
}

export function FiscalSection({ fiscalConfig, invoices }: { fiscalConfig: FiscalConfigUI; invoices: InvoiceRow[] }) {
  const cfg = fiscalConfig;
  const router = useRouter();

  // ── form state ──────────────────────────────────────────────────────────
  const [enabled, setEnabled] = useState(cfg?.enabled ?? false);
  const [tpAmb, setTpAmb] = useState(cfg?.tpAmb ?? '2');

  // Emitente
  const [cnpj, setCnpj] = useState(cfg?.cnpj ?? '');
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState(cfg?.inscricaoMunicipal ?? '');
  const [razaoSocial, setRazaoSocial] = useState(cfg?.razaoSocial ?? '');
  const [email, setEmail] = useState(cfg?.email ?? '');
  const [fone, setFone] = useState(cfg?.fone ?? '');

  // Endereço
  const [logradouro, setLogradouro] = useState(cfg?.logradouro ?? '');
  const [numero, setNumero] = useState(cfg?.numero ?? '');
  const [complemento, setComplemento] = useState(cfg?.complemento ?? '');
  const [bairro, setBairro] = useState(cfg?.bairro ?? '');
  const [codMunicipio, setCodMunicipio] = useState(cfg?.codMunicipio ?? '');
  const [uf, setUf] = useState(cfg?.uf ?? '');
  const [cep, setCep] = useState(cfg?.cep ?? '');

  // Regime tributário
  const [opSimpNac, setOpSimpNac] = useState(cfg?.opSimpNac ?? '');
  const [regApTribSN, setRegApTribSN] = useState(cfg?.regApTribSN ?? '');
  const [regEspTrib, setRegEspTrib] = useState(cfg?.regEspTrib ?? '');
  const [tribISSQN, setTribISSQN] = useState(cfg?.tribISSQN ?? '');
  const [tpRetISSQN, setTpRetISSQN] = useState(cfg?.tpRetISSQN ?? '');

  // Local de incidência
  const [cLocIncid, setCLocIncid] = useState(cfg?.cLocIncid ?? '');
  const [xLocIncid, setXLocIncid] = useState(cfg?.xLocIncid ?? '');
  const [xLocEmi, setXLocEmi] = useState(cfg?.xLocEmi ?? '');
  const [xLocPrestacao, setXLocPrestacao] = useState(cfg?.xLocPrestacao ?? '');

  // Tributação do serviço
  const [cTribNac, setCTribNac] = useState(cfg?.cTribNac ?? '');
  const [cTribMun, setCTribMun] = useState(cfg?.cTribMun ?? '');
  const [cNBS, setCNBS] = useState(cfg?.cNBS ?? '');
  const [xTribNac, setXTribNac] = useState(cfg?.xTribNac ?? '');
  const [xTribMun, setXTribMun] = useState(cfg?.xTribMun ?? '');
  const [xNBS, setXNBS] = useState(cfg?.xNBS ?? '');

  // Série e descrição
  const [serie, setSerie] = useState(cfg?.serie ?? '1');
  const [descricaoServicoPadrao, setDescricaoServicoPadrao] = useState(cfg?.descricaoServicoPadrao ?? '');

  // ── save state ──────────────────────────────────────────────────────────
  const [isPending, startTransition] = useTransition();
  const [savedOk, setSavedOk] = useState(false);

  // ── dispatch state ───────────────────────────────────────────────────────
  const [isDispatching, startDispatchTransition] = useTransition();
  const [dispatchResult, setDispatchResult] = useState<{ sent: number; pendingNoPdf: number } | null>(null);

  function handleSave() {
    startTransition(async () => {
      setSavedOk(false);
      await saveFiscalConfig({
        enabled,
        tpAmb: tpAmb as '1' | '2',
        cnpj: cnpj || null,
        inscricaoMunicipal: inscricaoMunicipal || null,
        razaoSocial: razaoSocial || null,
        email: email || null,
        fone: fone || null,
        logradouro: logradouro || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        codMunicipio: codMunicipio || null,
        uf: uf || null,
        cep: cep || null,
        opSimpNac: opSimpNac || null,
        regApTribSN: regApTribSN || null,
        regEspTrib: regEspTrib || null,
        tribISSQN: tribISSQN || null,
        tpRetISSQN: tpRetISSQN || null,
        cLocIncid: cLocIncid || null,
        xLocIncid: xLocIncid || null,
        xLocEmi: xLocEmi || null,
        xLocPrestacao: xLocPrestacao || null,
        cTribNac: cTribNac || null,
        cTribMun: cTribMun || null,
        cNBS: cNBS || null,
        xTribNac: xTribNac || null,
        xTribMun: xTribMun || null,
        xNBS: xNBS || null,
        serie: serie || '1',
        descricaoServicoPadrao: descricaoServicoPadrao || null,
      });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    });
  }

  function handleDispatch() {
    setDispatchResult(null);
    startDispatchTransition(async () => {
      const result = await dispatchPendingInvoices();
      setDispatchResult(result);
      router.refresh();
    });
  }

  // ── sub-tab state ────────────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<'config' | 'notas'>('config');

  // ── filter state (notas emitidas) ────────────────────────────────────────
  const [filterText, setFilterText] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const filteredInvoices = invoices.filter((inv) => {
    // Text filter: name or CPF (digits-only comparison for CPF)
    if (filterText) {
      const q = filterText.toLowerCase();
      const qDigits = q.replace(/\D/g, '');
      const nameMatch = inv.buyerName?.toLowerCase().includes(q) ?? false;
      const cpfMatch = qDigits
        ? (inv.buyerCpf?.replace(/\D/g, '').includes(qDigits) ?? false)
        : false;
      if (!nameMatch && !cpfMatch) return false;
    }
    // Date from (inclusive)
    if (filterFrom) {
      const from = new Date(filterFrom + 'T00:00:00');
      if (new Date(inv.createdAt) < from) return false;
    }
    // Date to (inclusive, end of day)
    if (filterTo) {
      const to = new Date(filterTo + 'T23:59:59.999');
      if (new Date(inv.createdAt) > to) return false;
    }
    return true;
  });

  // ── certificate upload state ─────────────────────────────────────────────
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState('');
  const [certUploading, setCertUploading] = useState(false);
  const [certResult, setCertResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleCertUpload() {
    if (!certFile) return;
    setCertUploading(true);
    setCertResult(null);
    try {
      const fd = new FormData();
      fd.append('file', certFile);
      fd.append('password', certPassword);
      const res = await fetch('/api/admin/fiscal/certificate', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setCertResult({ ok: true, msg: `Certificado enviado · ${data.subject ?? ''}` });
        setCertFile(null);
        setCertPassword('');
      } else {
        setCertResult({ ok: false, msg: data.error ?? 'Erro ao enviar certificado.' });
      }
    } catch {
      setCertResult({ ok: false, msg: 'Erro de rede.' });
    } finally {
      setCertUploading(false);
    }
  }

  return (
    <div className="col gap-20">
      {/* ── Sub-abas ────────────────────────────────────────────────────── */}
      <div className="tabs">
        <button className="tab" data-active={subTab === 'config'} onClick={() => setSubTab('config')}>
          Configuração
        </button>
        <button className="tab" data-active={subTab === 'notas'} onClick={() => setSubTab('notas')}>
          Notas emitidas ({invoices.length})
        </button>
      </div>

      {subTab === 'config' && (<>
      {/* ── Configuração fiscal ─────────────────────────────────────────── */}
      <SectionCard
        title="Configuração fiscal"
        subtitle="Dados do emitente, ambiente, tributação e padrões de emissão de NFS-e."
        icon="file"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Ativação */}
          <label className="row" style={{ gap: 8, fontSize: 13, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>
              Emissão de nota fiscal ativada
              <span className="muted" style={{ display: 'block', fontSize: 11.5, marginTop: 2 }}>
                Quando ativo, o sistema tenta emitir NFS-e automaticamente após cada pagamento confirmado.
              </span>
            </span>
          </label>

          {/* Ambiente */}
          <div className="field-group">
            <label className="field-label">Ambiente</label>
            <div className="row gap-12">
              {([['2', '🧪 Homologação (testes)'], ['1', '🚀 Produção']] as const).map(([val, label]) => (
                <label
                  key={val}
                  className="row gap-8"
                  style={{
                    cursor: 'pointer', fontSize: 13, padding: '10px 16px', borderRadius: 8,
                    border: `2px solid ${tpAmb === val ? 'var(--accent)' : 'var(--border)'}`,
                    background: tpAmb === val ? 'var(--accent-soft)' : 'transparent',
                    flex: 1, justifyContent: 'center',
                  }}
                >
                  <input type="radio" name="tpAmb" value={val} checked={tpAmb === val} onChange={() => setTpAmb(val)} style={{ display: 'none' }} />
                  {label}
                </label>
              ))}
            </div>
            {tpAmb === '1' && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: '#fef3c7', border: '1px solid #f59e0b', fontSize: 12, color: '#92400e' }}>
                ⚠️ Modo produção — notas fiscais reais serão emitidas.
              </div>
            )}
          </div>

          {/* Emitente */}
          <SubHeading>Dados do emitente</SubHeading>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">CNPJ <span className="muted">(somente números)</span></label>
              <input className="input-field" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00000000000000" inputMode="numeric" maxLength={14} />
            </div>
            <div className="field-group">
              <label className="field-label">Inscrição municipal</label>
              <input className="input-field" value={inscricaoMunicipal} onChange={(e) => setInscricaoMunicipal(e.target.value)} placeholder="ex: 1234567" />
            </div>
          </div>
          <div className="field-group">
            <label className="field-label">Razão social</label>
            <input className="input-field" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Nome empresarial conforme o CNPJ" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">E-mail</label>
              <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com.br" />
            </div>
            <div className="field-group">
              <label className="field-label">Telefone</label>
              <input className="input-field" value={fone} onChange={(e) => setFone(e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" />
            </div>
          </div>

          {/* Endereço */}
          <SubHeading>Endereço do emitente</SubHeading>
          <div className="field-group">
            <label className="field-label">Logradouro</label>
            <input className="input-field" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} placeholder="Rua, Avenida…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">Número</label>
              <input className="input-field" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" />
            </div>
            <div className="field-group">
              <label className="field-label">Complemento</label>
              <input className="input-field" value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Sala 10" />
            </div>
            <div className="field-group">
              <label className="field-label">Bairro</label>
              <input className="input-field" value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Centro" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">Código do município <span className="muted">(IBGE, 7 dígitos)</span></label>
              <input className="input-field" value={codMunicipio} onChange={(e) => setCodMunicipio(e.target.value)} placeholder="3550308" maxLength={7} inputMode="numeric" />
            </div>
            <div className="field-group">
              <label className="field-label">UF</label>
              <input className="input-field" value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} placeholder="SP" maxLength={2} />
            </div>
            <div className="field-group">
              <label className="field-label">CEP</label>
              <input className="input-field" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" maxLength={9} inputMode="numeric" />
            </div>
          </div>

          {/* Regime tributário */}
          <SubHeading>Regime tributário</SubHeading>
          <p className="muted" style={{ fontSize: 11.5, marginTop: -10, marginBottom: 4, lineHeight: 1.5 }}>
            Estes códigos vêm da orientação do seu contador conforme a legislação do município.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">opSimpNac</label>
              <input className="input-field" value={opSimpNac} onChange={(e) => setOpSimpNac(e.target.value)} placeholder="ex: 1" maxLength={1} />
            </div>
            <div className="field-group">
              <label className="field-label">regApTribSN</label>
              <input className="input-field" value={regApTribSN} onChange={(e) => setRegApTribSN(e.target.value)} placeholder="ex: 0" maxLength={1} />
            </div>
            <div className="field-group">
              <label className="field-label">regEspTrib</label>
              <input className="input-field" value={regEspTrib} onChange={(e) => setRegEspTrib(e.target.value)} placeholder="ex: 0" maxLength={1} />
            </div>
            <div className="field-group">
              <label className="field-label">tribISSQN</label>
              <input className="input-field" value={tribISSQN} onChange={(e) => setTribISSQN(e.target.value)} placeholder="ex: 1" maxLength={1} />
            </div>
            <div className="field-group">
              <label className="field-label">tpRetISSQN</label>
              <input className="input-field" value={tpRetISSQN} onChange={(e) => setTpRetISSQN(e.target.value)} placeholder="ex: 1" maxLength={1} />
            </div>
          </div>

          {/* Local de incidência */}
          <SubHeading>Local de incidência</SubHeading>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">cLocIncid <span className="muted">(código IBGE)</span></label>
              <input className="input-field" value={cLocIncid} onChange={(e) => setCLocIncid(e.target.value)} placeholder="3550308" maxLength={7} inputMode="numeric" />
            </div>
            <div className="field-group">
              <label className="field-label">xLocIncid</label>
              <input className="input-field" value={xLocIncid} onChange={(e) => setXLocIncid(e.target.value)} placeholder="São Paulo" />
            </div>
            <div className="field-group">
              <label className="field-label">xLocEmi</label>
              <input className="input-field" value={xLocEmi} onChange={(e) => setXLocEmi(e.target.value)} placeholder="São Paulo" />
            </div>
            <div className="field-group">
              <label className="field-label">xLocPrestacao</label>
              <input className="input-field" value={xLocPrestacao} onChange={(e) => setXLocPrestacao(e.target.value)} placeholder="São Paulo" />
            </div>
          </div>

          {/* Tributação do serviço */}
          <SubHeading>Tributação do serviço</SubHeading>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">cTribNac</label>
              <input className="input-field" value={cTribNac} onChange={(e) => setCTribNac(e.target.value)} placeholder="ex: 070700" />
            </div>
            <div className="field-group">
              <label className="field-label">cTribMun</label>
              <input className="input-field" value={cTribMun} onChange={(e) => setCTribMun(e.target.value)} placeholder="ex: 07070" />
            </div>
            <div className="field-group">
              <label className="field-label">cNBS</label>
              <input className="input-field" value={cNBS} onChange={(e) => setCNBS(e.target.value)} placeholder="ex: 1.03.01.00.00" />
            </div>
            <div className="field-group">
              <label className="field-label">xTribNac</label>
              <input className="input-field" value={xTribNac} onChange={(e) => setXTribNac(e.target.value)} placeholder="Descrição tributação nacional" />
            </div>
            <div className="field-group">
              <label className="field-label">xTribMun</label>
              <input className="input-field" value={xTribMun} onChange={(e) => setXTribMun(e.target.value)} placeholder="Descrição tributação municipal" />
            </div>
            <div className="field-group">
              <label className="field-label">xNBS</label>
              <input className="input-field" value={xNBS} onChange={(e) => setXNBS(e.target.value)} placeholder="Descrição NBS" />
            </div>
          </div>

          {/* Série e descrição padrão */}
          <SubHeading>Padrões de emissão</SubHeading>
          <div className="field-group">
            <label className="field-label">Série da nota</label>
            <input className="input-field" value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="1" maxLength={5} style={{ maxWidth: 120 }} />
          </div>
          <div className="field-group">
            <label className="field-label">Descrição do serviço padrão</label>
            <textarea
              className="input-field"
              rows={3}
              value={descricaoServicoPadrao}
              onChange={(e) => setDescricaoServicoPadrao(e.target.value)}
              placeholder="Descreva o serviço que aparecerá na NFS-e quando não houver descrição específica."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Salvar */}
          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            {savedOk && <span className="muted" style={{ fontSize: 12 }}>✓ Salvo</span>}
            <button type="button" className="btn btn-accent" disabled={isPending} onClick={handleSave}>
              <Icon name="check" size={14} /> {isPending ? 'Salvando…' : 'Salvar configuração'}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ── Certificado digital ─────────────────────────────────────────── */}
      <SectionCard
        title="Certificado digital"
        subtitle="Certificado A1 (.pfx / .p12) usado para assinar as NFS-e emitidas."
        icon="certificate"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status do certificado atual */}
          {cfg?.hasCertificate && (
            <div style={{ padding: '12px 16px', borderRadius: 9, background: 'var(--accent-soft)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="chip chip-success" style={{ fontSize: 11, flexShrink: 0 }}>✓ Certificado configurado</span>
              <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                {cfg.certSubject && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{cfg.certSubject}</div>}
                {cfg.certValidoAte && (
                  <div className="muted" style={{ fontSize: 11.5 }}>
                    Válido até {new Date(cfg.certValidoAte).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="field-group">
            <label className="field-label">
              {cfg?.hasCertificate ? 'Substituir certificado (.pfx / .p12)' : 'Arquivo do certificado (.pfx / .p12)'}
            </label>
            <input
              type="file"
              accept=".pfx,.p12"
              className="input-field"
              style={{ cursor: 'pointer' }}
              onChange={(e) => setCertFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="field-group">
            <label className="field-label">Senha do certificado</label>
            <input
              className="input-field"
              type="password"
              value={certPassword}
              onChange={(e) => setCertPassword(e.target.value)}
              placeholder={cfg?.hasCertPassword ? '•••••••• — digite para substituir' : 'Senha do arquivo .pfx'}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
            />
          </div>

          {certResult && (
            <p style={{ fontSize: 12.5, color: certResult.ok ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)', lineHeight: 1.5 }}>
              {certResult.ok ? '✓ ' : '✕ '}{certResult.msg}
            </p>
          )}

          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-accent"
              disabled={certUploading || !certFile}
              onClick={handleCertUpload}
            >
              <Icon name="upload" size={14} /> {certUploading ? 'Enviando…' : 'Enviar certificado'}
            </button>
          </div>

          <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
            O arquivo .pfx é criptografado antes de ser armazenado. A senha nunca é transmitida em texto simples após o envio.
          </p>
        </div>
      </SectionCard>

      </>)}

      {subTab === 'notas' && (<>
      {/* ── Notas emitidas ──────────────────────────────────────────────── */}
      <SectionCard
        title="Notas emitidas"
        subtitle="Histórico de NFS-e emitidas pela plataforma."
        icon="file"
      >
        {/* Envio manual de notificações */}
        {(() => {
          const pendentes = invoices.filter((i) => i.status === 'autorizada' && !i.notifiedAt).length;
          return (
            <div className="col gap-8" style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
              <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-accent"
                  disabled={isDispatching || pendentes === 0}
                  onClick={handleDispatch}
                >
                  <Icon name="send" size={14} />
                  {isDispatching ? 'Enviando…' : `Enviar notas pendentes (${pendentes})`}
                </button>
                {dispatchResult && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {dispatchResult.sent} nota{dispatchResult.sent !== 1 ? 's' : ''} enviada{dispatchResult.sent !== 1 ? 's' : ''}
                    {dispatchResult.pendingNoPdf > 0 && ` · ${dispatchResult.pendingNoPdf} ainda sem PDF (clique de novo mais tarde)`}
                  </span>
                )}
              </div>
              <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.5, margin: 0 }}>
                Notas emitidas há pouco podem não ter o PDF pronto ainda — aguarde ~1 hora e clique de novo.
              </p>
            </div>
          );
        })()}

        {/* Filtros */}
        <div className="col gap-12" style={{ marginBottom: 20 }}>
          <div className="field-group">
            <label className="field-label">Buscar por nome ou CPF</label>
            <input
              className="input-field"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Nome do comprador ou CPF (com ou sem pontuação)"
            />
          </div>
          <div className="row gap-12" style={{ flexWrap: 'wrap' }}>
            <div className="field-group" style={{ flex: '1 1 160px' }}>
              <label className="field-label">De</label>
              <input
                className="input-field"
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
              />
            </div>
            <div className="field-group" style={{ flex: '1 1 160px' }}>
              <label className="field-label">Até</label>
              <input
                className="input-field"
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
              />
            </div>
            {(filterText || filterFrom || filterTo) && (
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 1 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setFilterText(''); setFilterFrom(''); setFilterTo(''); }}
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
          {(filterText || filterFrom || filterTo) && (
            <p className="muted" style={{ fontSize: 12 }}>
              {filteredInvoices.length} de {invoices.length} nota{invoices.length !== 1 ? 's' : ''} encontrada{filteredInvoices.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {invoices.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Nenhuma nota emitida ainda.</p>
        ) : filteredInvoices.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Nenhuma nota encontrada para o filtro.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Comprador</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th style={{ width: 200 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <InvoiceRow key={inv.id} inv={inv} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      </>)}
    </div>
  );
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  autorizada: { label: 'Autorizada', bg: '#dcfce7', color: '#166534' },
  pendente:   { label: 'Pendente',   bg: 'var(--bg-muted)', color: 'var(--text-muted)' },
  erro:       { label: 'Erro',       bg: '#fee2e2', color: '#991b1b' },
  cancelada:  { label: 'Cancelada',  bg: '#fef3c7', color: '#92400e' },
};

function InvoiceRow({ inv }: { inv: InvoiceRow }) {
  const [isPending, startTransition] = useTransition();
  const badge = STATUS_BADGE[inv.status] ?? STATUS_BADGE.pendente;

  function handleRetryPdf() {
    startTransition(async () => {
      await retryInvoicePdf(inv.id);
    });
  }

  function handleCancel() {
    const motivo = window.prompt('Motivo do cancelamento:');
    if (motivo === null) return; // cancelou o prompt
    startTransition(async () => {
      await cancelInvoiceManual(inv.id, motivo || 'Cancelamento manual');
    });
  }

  return (
    <tr>
      <td className="muted mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
        {new Date(inv.createdAt).toLocaleDateString('pt-BR')}
      </td>
      <td style={{ fontSize: 13 }}>{inv.buyerName ?? '—'}</td>
      <td className="mono" style={{ fontSize: 13 }}>
        {inv.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </td>
      <td>
        <span
          className="chip"
          style={{ fontSize: 11, background: badge.bg, color: badge.color, textDecoration: inv.status === 'cancelada' ? 'line-through' : undefined }}
        >
          {badge.label}
        </span>
        {inv.status === 'erro' && inv.errorMessage && (
          <p className="muted" style={{ fontSize: 11, marginTop: 2, maxWidth: 220 }} title={inv.errorMessage}>
            {inv.errorMessage.slice(0, 60)}{inv.errorMessage.length > 60 ? '…' : ''}
          </p>
        )}
      </td>
      <td>
        <div className="row gap-4" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {inv.pdfUrl ? (
            <a
              className="btn btn-ghost btn-sm"
              href={inv.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11 }}
            >
              Baixar PDF
            </a>
          ) : inv.status === 'autorizada' ? (
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11 }}
              disabled={isPending}
              onClick={handleRetryPdf}
            >
              {isPending ? 'Buscando…' : 'Baixar PDF'}
            </button>
          ) : null}
          {inv.status === 'autorizada' && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11, color: 'var(--danger)' }}
              disabled={isPending}
              onClick={handleCancel}
            >
              Cancelar
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
