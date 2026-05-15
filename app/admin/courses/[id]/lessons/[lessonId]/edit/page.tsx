'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { adminUpdateLesson } from '@/lib/actions';
import { BunnyVideoPicker } from '@/components/bunny-video-picker';
import { PandaVideoPicker } from '@/components/panda-video-picker';

type LessonDetail = {
  id: string; title: string; type: string; duration: string | null;
  bunnyVideoId: string | null; pandaVideoId: string | null;
  videoUrl: string | null;
  transcript: string | null; aiSummary: string | null; content: string | null;
  published: boolean; allowComments: boolean;
  module: { id: string; title: string; courseId: string };
  courseTitle: string;
  pandaPlayerId: string | null;
  pandaConfigured: boolean;
  bunnyConfigured: boolean;
};

type PlayerKey = 'bunny' | 'panda' | 'url';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function urlToEmbed(url: string): string | null {
  if (!url) return null;
  const yt = extractYouTubeId(url);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  // Fallback: assume the URL itself is embeddable
  if (/^https?:\/\//.test(url)) return url;
  return null;
}

export default function EditLessonPage() {
  const params = useParams<{ id: string; lessonId: string }>();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [saving, setSaving] = useState<null | 'draft' | 'publish' | 'unpublish'>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [transcriptText, setTranscriptText] = useState('');
  const [bunnyId, setBunnyId] = useState('');
  const [pandaId, setPandaId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [activePlayer, setActivePlayer] = useState<PlayerKey>('url');
  const [tab, setTab] = useState<'info' | 'transcript' | 'summary'>('info');
  const [allowComments, setAllowComments] = useState(true);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');

  useEffect(() => {
    fetch(`/api/admin/lessons/${params.lessonId}`)
      .then((r) => r.json())
      .then((d: LessonDetail) => {
        setLesson(d);
        setTranscriptText(d.transcript ?? '');
        setSummaryText(d.aiSummary ?? '');
        setBunnyId(d.bunnyVideoId ?? '');
        setPandaId(d.pandaVideoId ?? '');
        setVideoUrl(d.videoUrl ?? '');
        setAllowComments(d.allowComments);
        setTitle(d.title);
        setDuration(d.duration ?? '');
        // Pick initial active player based on what's already set, then fall back to first configured option
        if (d.bunnyVideoId && d.bunnyConfigured) setActivePlayer('bunny');
        else if (d.pandaVideoId && d.pandaConfigured) setActivePlayer('panda');
        else if (d.videoUrl) setActivePlayer('url');
        else if (d.bunnyConfigured) setActivePlayer('bunny');
        else if (d.pandaConfigured) setActivePlayer('panda');
        else setActivePlayer('url');
      });
  }, [params.lessonId]);

  const availablePlayers = useMemo<Array<{ id: PlayerKey; label: string; color: string }>>(() => {
    if (!lesson) return [];
    const list: Array<{ id: PlayerKey; label: string; color: string }> = [];
    if (lesson.bunnyConfigured) list.push({ id: 'bunny', label: 'BunnyNet Stream', color: '#f97316' });
    if (lesson.pandaConfigured) list.push({ id: 'panda', label: 'Panda Video', color: '#7c3aed' });
    list.push({ id: 'url', label: 'URL (YouTube/Vimeo)', color: '#ef4444' });
    return list;
  }, [lesson]);

  async function save(publishedOverride?: boolean) {
    if (!lesson) return;
    const which = publishedOverride === undefined ? 'draft' : (publishedOverride ? 'publish' : 'unpublish');
    setSaving(which);
    try {
      await adminUpdateLesson(lesson.id, {
        title: title || undefined,
        duration: duration || undefined,
        published: publishedOverride !== undefined ? publishedOverride : lesson.published,
        allowComments,
        bunnyVideoId: bunnyId,
        pandaVideoId: pandaId,
        videoUrl: videoUrl,
        transcript: transcriptText,
        aiSummary: summaryText,
      });
      if (publishedOverride !== undefined) {
        setLesson({ ...lesson, published: publishedOverride });
      }
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveOnly() {
    await save();
  }
  async function handlePublish() {
    await save(true);
  }
  async function handleUnpublish() {
    await save(false);
  }
  async function handleSaveAndExit() {
    await save();
    router.back();
  }

  function close() {
    router.back();
  }

  async function handleGenerateSummary() {
    if (!lesson) return;
    setGeneratingSummary(true);
    const res = await fetch('/api/ai/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, transcript: transcriptText, title: lesson.title }),
    });
    const data = await res.json();
    setSummaryText(data.summary ?? '');
    setGeneratingSummary(false);
  }

  if (!lesson) return <div style={{ padding: 40 }}><p className="muted">Carregando…</p></div>;

  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
  const bunnyEmbedUrl = bunnyId && libraryId
    ? `https://iframe.mediadelivery.net/embed/${libraryId}/${bunnyId}?autoplay=false&responsive=true`
    : null;
  const pandaEmbedUrl = pandaId && lesson.pandaPlayerId
    ? `https://player-vz-${lesson.pandaPlayerId}.tv.pandavideo.com.br/embed/?v=${pandaId}`
    : null;
  const urlEmbedSrc = urlToEmbed(videoUrl);

  const noPlayersConfigured = !lesson.bunnyConfigured && !lesson.pandaConfigured;
  const isPublished = lesson.published;

  return (
    <div style={{ maxWidth: 780, paddingBottom: 96 }}>
      {/* Header */}
      <div className="row gap-12" style={{ alignItems: 'center', marginBottom: 24, justifyContent: 'space-between' }}>
        <div className="row gap-12" style={{ alignItems: 'center' }}>
          <button type="button" className="icon-btn" onClick={close} title="Voltar">
            <Icon name="arrow-left" size={16} />
          </button>
          <div>
            <h2 className="h2" style={{ marginBottom: 2 }}>Editar aula</h2>
            <p className="muted" style={{ fontSize: 13 }}>{lesson.courseTitle} · {lesson.module.title}</p>
          </div>
        </div>
        <StatusBadge published={isPublished} />
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {([
          { id: 'info', label: 'Informações' },
          { id: 'transcript', label: 'Transcrição' },
          { id: 'summary', label: 'Resumo IA' },
        ] as const).map((t) => (
          <button key={t.id} className="tab" data-active={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {tab === 'info' && (
          <>
            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }}>
                <div className="field-group">
                  <label className="field-label">Título da aula *</label>
                  <input required className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Duração</label>
                  <input className="input-field" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="18:30" style={{ width: 100 }} />
                </div>
              </div>
              <label className="row gap-8" style={{ cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} />
                Permitir comentários
              </label>
            </div>

            {/* Video player card */}
            <div className="card" style={{ padding: 24 }}>
              <div className="row gap-8" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
                {availablePlayers.map((p) => {
                  const hasContent =
                    (p.id === 'bunny' && bunnyId) ||
                    (p.id === 'panda' && pandaId) ||
                    (p.id === 'url' && videoUrl);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActivePlayer(p.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: `2px solid ${activePlayer === p.id ? p.color : 'var(--border)'}`,
                        background: activePlayer === p.id ? `${p.color}18` : 'transparent',
                        color: activePlayer === p.id ? p.color : 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Icon name="play" size={13} />
                      {p.label}
                      {hasContent && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />}
                    </button>
                  );
                })}
              </div>

              {noPlayersConfigured && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef3c7', border: '1px solid #f59e0b', fontSize: 12.5, color: '#92400e', marginBottom: 14 }}>
                  Nenhum player de vídeo está configurado. Configure BunnyNet ou Panda em{' '}
                  <Link href="/admin/settings" style={{ color: '#92400e', fontWeight: 600 }}>Configurações → Players</Link>,
                  ou use a opção URL (YouTube/Vimeo).
                </div>
              )}

              {activePlayer === 'bunny' && lesson.bunnyConfigured && (
                <>
                  <PlayerHeader bg="linear-gradient(135deg, #f97316, #ea580c)" title="BunnyNet Stream" hint="Selecione um vídeo da sua biblioteca" />
                  <div className="row gap-10" style={{ marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="field-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
                      <label className="field-label">GUID do vídeo</label>
                      <input className="input-field" value={bunnyId} onChange={(e) => setBunnyId(e.target.value)} placeholder="Selecione via biblioteca ou cole manualmente" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                    </div>
                    <BunnyVideoPicker currentGuid={bunnyId} onSelect={(guid) => setBunnyId(guid)} />
                    {bunnyId && <ClearButton onClick={() => setBunnyId('')} />}
                  </div>
                  {bunnyEmbedUrl ? <EmbedFrame src={bunnyEmbedUrl} /> : <EmptyVideoPlaceholder label='Selecione um vídeo da biblioteca' />}
                </>
              )}

              {activePlayer === 'panda' && lesson.pandaConfigured && (
                <>
                  <PlayerHeader bg="linear-gradient(135deg, #7c3aed, #6d28d9)" title="Panda Video" hint="Cole o ID do vídeo do Panda Video" />
                  <div className="row gap-10" style={{ marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="field-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
                      <label className="field-label">ID do vídeo</label>
                      <input className="input-field" value={pandaId} onChange={(e) => setPandaId(e.target.value)} placeholder="Selecione via biblioteca ou cole manualmente" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                    </div>
                    <PandaVideoPicker currentId={pandaId} onSelect={(id) => setPandaId(id)} />
                    {pandaId && <ClearButton onClick={() => setPandaId('')} />}
                  </div>
                  {pandaEmbedUrl ? <EmbedFrame src={pandaEmbedUrl} /> : <EmptyVideoPlaceholder label="Cole o ID do vídeo acima para visualizar o preview" />}
                </>
              )}

              {activePlayer === 'url' && (
                <>
                  <PlayerHeader bg="linear-gradient(135deg, #ef4444, #b91c1c)" title="URL (YouTube/Vimeo)" hint="Cole o link público do vídeo" />
                  <div className="row gap-10" style={{ marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="field-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
                      <label className="field-label">URL do vídeo</label>
                      <input className="input-field" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                    </div>
                    {videoUrl && <ClearButton onClick={() => setVideoUrl('')} />}
                  </div>
                  {urlEmbedSrc ? <EmbedFrame src={urlEmbedSrc} /> : <EmptyVideoPlaceholder label="Cole uma URL do YouTube, Vimeo ou outro player compatível" />}
                </>
              )}
            </div>
          </>
        )}

        {tab === 'transcript' && (
          <div className="card" style={{ padding: 24 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Transcrição da aula</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Cole ou escreva a transcrição completa. Será exibida na aba "Transcrição" da aula.</div>
              </div>
              <span className="muted mono" style={{ fontSize: 11 }}>{transcriptText.length} chars</span>
            </div>
            <textarea
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Cole aqui a transcrição completa da aula…"
              className="input-field"
              style={{ minHeight: 420, resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.65 }}
            />
          </div>
        )}

        {tab === 'summary' && (
          <div className="card" style={{ padding: 24 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16, alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Resumo da aula</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Gere automaticamente com IA ou escreva manualmente. Exibido para todos os alunos.</div>
              </div>
              <button
                type="button"
                className="btn btn-accent btn-sm"
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                style={{ flexShrink: 0 }}
              >
                <Icon name="spark" size={13} /> {generatingSummary ? 'Gerando…' : 'Gerar com IA'}
              </button>
            </div>
            <textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              placeholder="O resumo aparecerá aqui após gerar com IA, ou você pode escrever manualmente…"
              className="input-field"
              style={{ minHeight: 360, resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: 14, lineHeight: 1.65 }}
            />
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: 32,
          marginLeft: -24,
          marginRight: -24,
          padding: '16px 24px',
          background: 'var(--bg-elevated)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 8,
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div className="row gap-12" style={{ alignItems: 'center' }}>
          <StatusBadge published={isPublished} />
          <span className="muted" style={{ fontSize: 12 }}>
            {isPublished ? 'Visível para alunos matriculados' : 'Não aparece para alunos até ser publicada'}
          </span>
        </div>
        <div className="row gap-8">
          <button type="button" className="btn btn-ghost" onClick={close} disabled={!!saving}>Cancelar</button>
          <button type="button" className="btn btn-soft" onClick={handleSaveOnly} disabled={!!saving}>
            <Icon name="check" size={14} /> {saving === 'draft' ? 'Salvando…' : 'Salvar'}
          </button>
          {isPublished ? (
            <button type="button" className="btn" onClick={handleUnpublish} disabled={!!saving} style={{ background: 'var(--bg-muted)', color: 'var(--text)' }}>
              {saving === 'unpublish' ? 'Despublicando…' : 'Despublicar'}
            </button>
          ) : (
            <button type="button" className="btn btn-accent" onClick={handlePublish} disabled={!!saving}>
              <Icon name="check" size={14} /> {saving === 'publish' ? 'Publicando…' : 'Publicar aula'}
            </button>
          )}
          <button type="button" className="btn btn-soft" onClick={handleSaveAndExit} disabled={!!saving} title="Salvar e voltar">
            Salvar e voltar
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className="chip"
      style={{
        background: published ? 'rgba(34, 197, 94, 0.12)' : 'rgba(250, 204, 21, 0.16)',
        color: published ? '#15803d' : '#92400e',
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: published ? '#22c55e' : '#facc15', display: 'inline-block', marginRight: 6 }} />
      {published ? 'Publicada' : 'Rascunho'}
    </span>
  );
}

function PlayerHeader({ bg, title, hint }: { bg: string; title: string; hint: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'grid', placeItems: 'center' }}>
        <Icon name="play" size={14} style={{ color: '#fff' }} />
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <div className="muted" style={{ fontSize: 11.5 }}>{hint}</div>
      </div>
    </div>
  );
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={onClick}>
      <Icon name="trash" size={13} />
    </button>
  );
}

function EmbedFrame({ src }: { src: string }) {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9' }}>
      <iframe
        src={src}
        style={{ width: '100%', height: '100%', border: 0 }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function EmptyVideoPlaceholder({ label }: { label: string }) {
  return (
    <div style={{ borderRadius: 10, background: 'var(--bg-muted)', aspectRatio: '16/9', display: 'grid', placeItems: 'center', border: '2px dashed var(--border)' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-faint)' }}>
        <Icon name="play-circle" size={36} />
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>{label}</p>
      </div>
    </div>
  );
}
