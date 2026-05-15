'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { saveSettings } from '@/lib/actions';

type Props = {
  initial: Record<string, string>;
  bunnyEnv: { libraryId: string; cdnHostname: string; configured: boolean };
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`chip ${ok ? 'chip-success' : ''}`} style={{ fontSize: 11, background: ok ? undefined : 'var(--bg-muted)', color: ok ? undefined : 'var(--text-muted)' }}>
      {ok ? '✓ ' : '○ '}{label}
    </span>
  );
}

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

export default function SettingsClient({ initial, bunnyEnv }: Props) {
  const [tab, setTab] = useState<'brand' | 'players' | 'payment'>('brand');
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Brand
  const [brandName, setBrandName] = useState(initial['brand_name'] ?? '');
  const [brandLogo, setBrandLogo] = useState(initial['brand_logo'] ?? '');
  const [brandFavicon, setBrandFavicon] = useState(initial['brand_favicon'] ?? '');
  const [brandColor, setBrandColor] = useState(initial['brand_color'] ?? '');
  const [brandFooter, setBrandFooter] = useState(initial['brand_footer'] ?? '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);

  // Panda Video
  const [pandaApiKey, setPandaApiKey] = useState(initial['panda_api_key'] ?? '');
  const [pandaPlayerId, setPandaPlayerId] = useState(initial['panda_player_id'] ?? '');

  // Asaas
  const [asaasApiKey, setAsaasApiKey] = useState(initial['asaas_api_key'] ?? '');
  const [asaasEnv, setAsaasEnv] = useState<'sandbox' | 'production'>(
    (initial['asaas_env'] as 'sandbox' | 'production') ?? 'sandbox'
  );
  const [asaasWebhookSecret, setAsaasWebhookSecret] = useState(initial['asaas_webhook_secret'] ?? '');

  async function uploadBrandAsset(file: File, setter: (url: string) => void, setBusy: (v: boolean) => void) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Falha no upload');
      setter(data.url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao enviar arquivo');
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(section: string, data: Record<string, string>) {
    setSaving(section);
    await saveSettings(data);
    setSaving(null);
    setSaved(section);
    setTimeout(() => setSaved(null), 2500);
  }

  const pandaConfigured = !!(pandaApiKey && pandaPlayerId);
  const asaasConfigured = !!asaasApiKey;

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 className="h2">Configurações</h2>
        <p className="muted mt-4" style={{ fontSize: 13 }}>Integrações de player de vídeo e meios de pagamento</p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 28 }}>
        <button className="tab" data-active={tab === 'brand'} onClick={() => setTab('brand')}>
          <Icon name="star" size={14} /> Marca
        </button>
        <button className="tab" data-active={tab === 'players'} onClick={() => setTab('players')}>
          <Icon name="play-circle" size={14} /> Players de Vídeo
        </button>
        <button className="tab" data-active={tab === 'payment'} onClick={() => setTab('payment')}>
          <Icon name="certificate" size={14} /> Pagamento
        </button>
      </div>

      {/* ─── MARCA ──────────────────────────────────────── */}
      {tab === 'brand' && (
        <div className="col gap-20">
          <SectionCard
            title="Identidade da plataforma"
            subtitle="Personalize nome, logo, cor e rodapé que aparecem em toda a área de membros."
            icon="star"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="field-group">
                <label className="field-label">Nome da plataforma</label>
                <input
                  className="input-field"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Atlas Members"
                />
                <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Aparece na sidebar, no título da aba e no rodapé.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <AssetField
                  label="Logo"
                  hint="PNG/SVG transparente fica melhor. Substitui a marca 'A' da sidebar."
                  value={brandLogo}
                  onChange={setBrandLogo}
                  onUpload={(file) => uploadBrandAsset(file, setBrandLogo, setUploadingLogo)}
                  uploading={uploadingLogo}
                  previewSize={56}
                />
                <AssetField
                  label="Favicon"
                  hint="Ícone que aparece na aba do navegador (32×32 PNG recomendado)."
                  value={brandFavicon}
                  onChange={setBrandFavicon}
                  onUpload={(file) => uploadBrandAsset(file, setBrandFavicon, setUploadingFavicon)}
                  uploading={uploadingFavicon}
                  previewSize={32}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Cor primária (accent)</label>
                <div className="row gap-10" style={{ alignItems: 'center' }}>
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(brandColor) ? brandColor : '#3b82f6'}
                    onChange={(e) => setBrandColor(e.target.value)}
                    style={{ width: 48, height: 38, padding: 0, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
                  />
                  <input
                    className="input-field"
                    style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#3b82f6 ou oklch(0.55 0.18 264)"
                  />
                  {brandColor && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBrandColor('')} title="Voltar pro padrão">
                      Limpar
                    </button>
                  )}
                </div>
                <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>Sobrescreve <code>--accent</code> globalmente. Aceita hex, rgb() ou oklch().</p>
              </div>

              <div className="field-group">
                <label className="field-label">Texto do rodapé</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={brandFooter}
                  onChange={(e) => setBrandFooter(e.target.value)}
                  placeholder="© 2026 Atlas Members. Todos os direitos reservados."
                />
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 20, gap: 10 }}>
              {saved === 'brand' && <span className="muted" style={{ fontSize: 12 }}>✓ Salvo</span>}
              <button
                type="button"
                className="btn btn-accent"
                disabled={saving === 'brand'}
                onClick={() => handleSave('brand', {
                  brand_name: brandName,
                  brand_logo: brandLogo,
                  brand_favicon: brandFavicon,
                  brand_color: brandColor,
                  brand_footer: brandFooter,
                })}
              >
                <Icon name="check" size={14} /> {saving === 'brand' ? 'Salvando…' : 'Salvar marca'}
              </button>
            </div>
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>Recarregue a página após salvar para ver favicon e cor aplicados em todas as telas.</p>
          </SectionCard>
        </div>
      )}

      {/* ─── PLAYERS ─────────────────────────────────────── */}
      {tab === 'players' && (
        <div className="col gap-20">

          {/* BunnyNet */}
          <SectionCard
            title="BunnyNet Stream"
            subtitle="Player principal configurado via variáveis de ambiente"
            icon="play"
          >
            <div className="row gap-10" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
              <StatusBadge ok={bunnyEnv.configured} label={bunnyEnv.configured ? 'Configurado' : 'Não configurado'} />
              {bunnyEnv.configured && <StatusBadge ok label="Ativo" />}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="field-group">
                <label className="field-label">Library ID</label>
                <div className="input-field" style={{ background: 'var(--bg-muted)', cursor: 'default', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  {bunnyEnv.libraryId || '—'}
                </div>
              </div>
              <div className="field-group">
                <label className="field-label">CDN Hostname</label>
                <div className="input-field" style={{ background: 'var(--bg-muted)', cursor: 'default', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  {bunnyEnv.cdnHostname || '—'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                As credenciais do BunnyNet são configuradas via <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>.env.local</code>.
                Para alterar, edite as variáveis <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>NEXT_PUBLIC_BUNNY_LIBRARY_ID</code>,{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>BUNNY_API_KEY</code> e{' '}
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>BUNNY_CDN_HOSTNAME</code>.
              </p>
            </div>

            {/* Embed preview test */}
            {bunnyEnv.configured && (
              <div style={{ marginTop: 20 }}>
                <p className="field-label" style={{ marginBottom: 10 }}>Teste de embed</p>
                <div style={{ borderRadius: 10, background: 'var(--bg-muted)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name="play" size={13} style={{ color: '#fff' }} />
                  </div>
                  <div className="grow">
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Player BunnyNet ativo</div>
                    <div className="muted" style={{ fontSize: 11.5 }}>
                      iframe.mediadelivery.net/embed/{bunnyEnv.libraryId}/&#123;videoId&#125;
                    </div>
                  </div>
                  <StatusBadge ok label="Online" />
                </div>
              </div>
            )}
          </SectionCard>

          {/* Panda Video */}
          <SectionCard
            title="Panda Video"
            subtitle="Player alternativo — configure sua API Key e Player ID"
            icon="play-circle"
          >
            <div className="row gap-10" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
              <StatusBadge ok={pandaConfigured} label={pandaConfigured ? 'Configurado' : 'Não configurado'} />
              {pandaConfigured && <StatusBadge ok label="Pronto para usar" />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field-group">
                <label className="field-label">API Key</label>
                <input
                  className="input-field"
                  type="password"
                  value={pandaApiKey}
                  onChange={(e) => setPandaApiKey(e.target.value)}
                  placeholder="Sua API Key do Panda Video"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                />
                <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  Encontre em app.pandavideo.com → Conta → API
                </p>
              </div>

              <div className="field-group">
                <label className="field-label">Player ID</label>
                <input
                  className="input-field"
                  value={pandaPlayerId}
                  onChange={(e) => setPandaPlayerId(e.target.value)}
                  placeholder="ex: player-vz-xxxxxxxx"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                />
                <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  O ID do player padrão — usado para gerar o embed: player-vz-&#123;ID&#125;.tv.pandavideo.com.br
                </p>
              </div>

              {pandaConfigured && (
                <div style={{ padding: '12px 16px', borderRadius: 9, background: 'var(--accent-soft)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 12.5, color: 'var(--accent-soft-fg)', lineHeight: 1.6, margin: 0 }}>
                    <strong>URL de embed:</strong><br />
                    <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                      https://player-vz-{pandaPlayerId}.tv.pandavideo.com.br/embed/?v=&#123;videoId&#125;
                    </code>
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-accent"
                  onClick={() => handleSave('panda', { panda_api_key: pandaApiKey, panda_player_id: pandaPlayerId })}
                  disabled={saving === 'panda'}
                >
                  {saved === 'panda' ? <><Icon name="check" size={14} /> Salvo!</> : saving === 'panda' ? 'Salvando…' : <><Icon name="check" size={14} /> Salvar Panda Video</>}
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ─── PAYMENT ─────────────────────────────────────── */}
      {tab === 'payment' && (
        <div className="col gap-20">
          <SectionCard
            title="Asaas"
            subtitle="Gateway de pagamento brasileiro — cobranças, assinaturas e PIX"
            icon="certificate"
          >
            <div className="row gap-10" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
              <StatusBadge ok={asaasConfigured} label={asaasConfigured ? 'Configurado' : 'Não configurado'} />
              <StatusBadge ok={asaasEnv === 'production'} label={asaasEnv === 'production' ? 'Produção' : 'Sandbox'} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Ambiente */}
              <div className="field-group">
                <label className="field-label">Ambiente</label>
                <div className="row gap-12">
                  {(['sandbox', 'production'] as const).map((env) => (
                    <label key={env} className="row gap-8" style={{ cursor: 'pointer', fontSize: 13, padding: '10px 16px', borderRadius: 8, border: `2px solid ${asaasEnv === env ? 'var(--accent)' : 'var(--border)'}`, background: asaasEnv === env ? 'var(--accent-soft)' : 'transparent', flex: 1, justifyContent: 'center' }}>
                      <input type="radio" name="asaasEnv" value={env} checked={asaasEnv === env} onChange={() => setAsaasEnv(env)} style={{ display: 'none' }} />
                      {env === 'sandbox' ? '🧪 Sandbox (testes)' : '🚀 Produção'}
                    </label>
                  ))}
                </div>
                {asaasEnv === 'production' && (
                  <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 7, background: '#fef3c7', border: '1px solid #f59e0b', fontSize: 12, color: '#92400e' }}>
                    ⚠️ Modo produção — cobranças reais serão realizadas.
                  </div>
                )}
              </div>

              {/* API Key */}
              <div className="field-group">
                <label className="field-label">API Key</label>
                <input
                  className="input-field"
                  type="password"
                  value={asaasApiKey}
                  onChange={(e) => setAsaasApiKey(e.target.value)}
                  placeholder={asaasEnv === 'sandbox' ? '$aact_... (chave sandbox)' : '$aact_... (chave produção)'}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                />
                <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  Encontre em app.asaas.com → Conta → Integrações → API Keys
                </p>
              </div>

              {/* Webhook */}
              <div className="field-group">
                <label className="field-label">Token de autenticação do webhook</label>
                <input
                  className="input-field"
                  type="password"
                  value={asaasWebhookSecret}
                  onChange={(e) => setAsaasWebhookSecret(e.target.value)}
                  placeholder="O mesmo token configurado no painel da Asaas"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                />
                <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  Crie um token aleatório no Asaas (Integrações → Webhooks → "Token de autenticação") e cole o <strong>mesmo valor</strong> aqui. Será validado no header <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>asaas-access-token</code>.
                </p>
              </div>

              {/* Webhook URL info */}
              <div style={{ padding: '14px 16px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>URL do Webhook</p>
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all' }}>
                  https://seu-dominio.com/api/webhooks/asaas
                </code>
                <p className="muted" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
                  Configure esta URL no painel da Asaas para receber notificações de pagamento e atualizar automaticamente o plano dos alunos.
                </p>
                <div className="row gap-8" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                  {['PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'SUBSCRIPTION_RENEWED'].map((ev) => (
                    <span key={ev} className="chip" style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>{ev}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-accent"
                  onClick={() => handleSave('asaas', { asaas_api_key: asaasApiKey, asaas_env: asaasEnv, asaas_webhook_secret: asaasWebhookSecret })}
                  disabled={saving === 'asaas'}
                >
                  {saved === 'asaas' ? <><Icon name="check" size={14} /> Salvo!</> : saving === 'asaas' ? 'Salvando…' : <><Icon name="check" size={14} /> Salvar Asaas</>}
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function AssetField({
  label,
  hint,
  value,
  onChange,
  onUpload,
  uploading,
  previewSize,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  previewSize: number;
}) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <div className="row gap-10" style={{ alignItems: 'center' }}>
        <div
          style={{
            width: previewSize,
            height: previewSize,
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-muted)',
            display: 'grid',
            placeItems: 'center',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <span className="muted" style={{ fontSize: 10 }}>—</span>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            className="input-field"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
          />
          <div className="row gap-8">
            <label className="btn btn-soft btn-sm" style={{ cursor: 'pointer' }}>
              {uploading ? 'Enviando…' : 'Upload'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = '';
                }}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            {value && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>
                Remover
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{hint}</p>
    </div>
  );
}
