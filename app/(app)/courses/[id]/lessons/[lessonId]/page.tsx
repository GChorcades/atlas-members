'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/icons';
import { markLessonDone, addNote, addComment, deleteComment } from '@/lib/actions';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { BunnyPlayer, type BunnyPlayerHandle } from '@/components/bunny-player';

function fmtTime(total: number): string {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

type LessonData = {
  lesson: {
    id: string; title: string; type: string; duration: string | null;
    videoUrl: string | null; bunnyVideoId: string | null; pandaVideoId: string | null;
    content: string | null; transcript: string | null;
    chapters: string | null;
    aiSummary: string | null; done: boolean; watchedSeconds: number;
    pandaPlayerId: string | null;
  };
  module: { id: string; title: string; position: number };
  course: { id: string; title: string; coverBg: string | null; coverGlyph: string | null; coverImage: string | null; instructor: string; progress: number; lessonCount: number };
  prevLessonId: string | null;
  nextLessonId: string | null;
  outline: {
    id: string; title: string; position: number; duration: string | null;
    lessons: { id: string; title: string; duration: string | null; type: string; done: boolean }[];
  }[];
  materials: { id: string; name: string; url: string; size: string | null; type: string }[];
  notes: { id: string; text: string; timestamp: string | null; createdAt: string }[];
  comments: Comment[];
};

type Comment = {
  id: string;
  parentId: string | null;
  text: string;
  imageUrl: string | null;
  author: string;
  avatar: string;
  isInstructor: boolean;
  isOwn: boolean;
  createdAt: string;
  likes: number;
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export default function LessonPage() {
  const params = useParams<{ id: string; lessonId: string }>();
  const searchParams = useSearchParams();
  const playerRef = useRef<BunnyPlayerHandle>(null);
  const [data, setData] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'notes');
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [noteText, setNoteText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [commentUploading, setCommentUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [replyUploading, setReplyUploading] = useState(false);

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Celebration overlay when marking a lesson as done
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    fetch(`/api/courses/${params.id}/lessons/${params.lessonId}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setOpenModules(new Set([d.module.id]));
        setLoading(false);
      });
  }, [params.id, params.lessonId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (loading) return <LessonSkeleton />;
  if (!data) return <div className="content"><p className="muted">Aula não encontrada.</p></div>;

  const { lesson, module: mod, course, outline, notes, comments } = data;
  const donePct = Math.round(course.progress * 100);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  async function handleMarkDone() {
    const wasDone = lesson.done;
    await markLessonDone(lesson.id, !wasDone);
    setData((d) => d ? { ...d, lesson: { ...d.lesson, done: !d.lesson.done } } : d);
    if (!wasDone) {
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1500);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    let stamp: string | undefined;
    if (playerRef.current) {
      try {
        const t = await playerRef.current.getCurrentTime();
        if (t > 0) stamp = String(Math.round(t));
      } catch { /* sem timestamp */ }
    }
    await addNote(lesson.id, noteText, stamp);
    setNoteText('');
    fetch(`/api/courses/${params.id}/lessons/${params.lessonId}`).then((r) => r.json()).then(setData);
  }

  async function uploadCommentImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const d = await res.json();
    if (!res.ok) {
      alert(d.error ?? 'Erro no upload');
      return null;
    }
    return d.url as string;
  }

  async function handleAddComment() {
    if (!commentText.trim() && !commentImage) return;
    await addComment(lesson.id, commentText, undefined, commentImage ?? undefined);
    setCommentText('');
    setCommentImage(null);
    fetch(`/api/courses/${params.id}/lessons/${params.lessonId}`).then((r) => r.json()).then(setData);
  }

  async function handleReply(parentId: string) {
    if (!replyText.trim() && !replyImage) return;
    await addComment(lesson.id, replyText, parentId, replyImage ?? undefined);
    setReplyText('');
    setReplyImage(null);
    setReplyingTo(null);
    fetch(`/api/courses/${params.id}/lessons/${params.lessonId}`).then((r) => r.json()).then(setData);
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Excluir este comentário?')) return;
    try {
      await deleteComment(commentId);
      fetch(`/api/courses/${params.id}/lessons/${params.lessonId}`).then((r) => r.json()).then(setData);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  async function handleChatSend() {
    if (!chatInput.trim() || chatStreaming) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatStreaming(true);

    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    setChatMessages([...newMessages, assistantMsg]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          lessonTitle: lesson.title,
          transcript: lesson.transcript,
          courseTitle: course.title,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulated };
          return updated;
        });
      }
    } finally {
      setChatStreaming(false);
    }
  }

  const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
  const bunnyEmbedUrl = lesson.bunnyVideoId && libraryId
    ? `https://iframe.mediadelivery.net/embed/${libraryId}/${lesson.bunnyVideoId}?autoplay=false&responsive=true&preload=true`
    : null;
  const pandaEmbedUrl = !bunnyEmbedUrl && lesson.pandaVideoId && lesson.pandaPlayerId
    ? `https://player-vz-${lesson.pandaPlayerId}.tv.pandavideo.com.br/embed/?v=${lesson.pandaVideoId}`
    : null;
  const urlEmbedUrl = !bunnyEmbedUrl && !pandaEmbedUrl && lesson.videoUrl
    ? urlToEmbed(lesson.videoUrl)
    : null;
  const videoEmbedUrl = bunnyEmbedUrl ?? pandaEmbedUrl ?? urlEmbedUrl;

  // Capítulos só são navegáveis quando o vídeo é da BunnyNet (player controlável).
  let chapters: { time: number; title: string }[] = [];
  if (bunnyEmbedUrl && lesson.chapters) {
    try {
      const parsed = JSON.parse(lesson.chapters);
      if (Array.isArray(parsed)) chapters = parsed;
    } catch { /* ignora JSON inválido */ }
  }

  const hasMaterial = !!(lesson.content?.trim() || (data.materials && data.materials.length > 0));
  const TABS = [
    { id: 'notes', label: 'Minhas notas' },
    ...(hasMaterial ? [{ id: 'material', label: 'Material' }] : []),
    { id: 'comments', label: `Comentários (${comments.length})` },
    { id: 'summary', label: 'Resumo IA' },
    { id: 'ai', label: '✦ Assistente IA' },
  ];

  return (
    <div className="content content-wide fade-up lesson-page-wrapper" style={{ maxWidth: '100%', padding: '24px 32px' }}>
      {celebrate && <Celebration />}
      {/* Breadcrumbs */}
      <div className="row gap-8 lesson-breadcrumbs" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        <Link href="/catalog" style={{ color: 'inherit' }}>Meus cursos</Link>
        <Icon name="chevron-right" size={14} style={{ opacity: 0.5 }} />
        <Link href={`/courses/${course.id}`} style={{ color: 'inherit' }}>{course.title}</Link>
        <Icon name="chevron-right" size={14} style={{ opacity: 0.5 }} />
        <span style={{ color: 'var(--text)' }}>{lesson.title}</span>
      </div>

      <div className="lesson-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, marginTop: 20 }}>
        <div style={{ minWidth: 0 }}>
          {/* Video Player */}
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#000', aspectRatio: '16 / 9' }}>
            {videoEmbedUrl && bunnyEmbedUrl ? (
              <BunnyPlayer ref={playerRef} src={videoEmbedUrl} />
            ) : videoEmbedUrl ? (
              <iframe
                src={videoEmbedUrl}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                <div style={{ position: 'absolute', inset: 0, background: course.coverImage ? `url(${course.coverImage}) center/cover` : (course.coverBg ?? '#1e1b4b') }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 50% at 50% 40%, rgba(255,255,255,0.12), transparent 70%)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: 40 }}>
                  <div>
                    {!course.coverImage && (
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 80, letterSpacing: '-0.04em', lineHeight: 1, color: 'rgba(255,255,255,0.18)' }}>{course.coverGlyph}</div>
                    )}
                    <div style={{ fontSize: 12, marginTop: 16, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6 }}>Vídeo · {lesson.duration}</div>
                    <div style={{ fontSize: 13, marginTop: 8, opacity: 0.5 }}>Vídeo ainda não publicado</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Capítulos do vídeo */}
          {chapters.length > 0 && (
            <div className="card" style={{ padding: '12px 14px', marginTop: 14 }}>
              <div className="muted" style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                Capítulos
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {chapters.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => playerRef.current?.seekTo(c.time)}
                    className="chapter-row"
                  >
                    <span className="mono" style={{ fontSize: 12, color: 'var(--accent)', flexShrink: 0, width: 56 }}>
                      {fmtTime(c.time)}
                    </span>
                    <span style={{ fontSize: 13.5 }}>{c.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title + nav */}
          <div className="row lesson-header-row" style={{ justifyContent: 'space-between', marginTop: 20, alignItems: 'flex-start', gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="muted lesson-module-eyebrow" style={{ fontSize: 12.5 }}>Módulo {String(mod.position + 1).padStart(2, '0')} · {mod.title}</div>
              <h1 className="h1 lesson-title-h1" style={{ marginTop: 6, fontSize: 24 }}>{lesson.title}</h1>
              <div className="row gap-16 mt-12 muted" style={{ fontSize: 13 }}>
                <span className="row gap-4"><Icon name="clock" size={13} /> {lesson.duration}</span>
                <span className="row gap-4">{course.instructor}</span>
              </div>
            </div>
            <div className="row gap-8 lesson-header-actions" style={{ flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button className={`btn btn-sm ${lesson.done ? 'btn-soft' : 'btn-accent'}`} onClick={handleMarkDone}>
                <Icon name="check" size={14} /> {lesson.done ? 'Concluída' : 'Marcar concluída'}
              </button>
              {data.prevLessonId && (
                <Link href={`/courses/${course.id}/lessons/${data.prevLessonId}`} className="btn btn-soft btn-sm">
                  <Icon name="arrow-left" size={14} />
                </Link>
              )}
              {data.nextLessonId && (
                <Link href={`/courses/${course.id}/lessons/${data.nextLessonId}`} className="btn btn-accent btn-sm">
                  Próxima <Icon name="arrow-right" size={14} />
                </Link>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs mt-24" style={{ overflowX: 'auto' }}>
            {TABS.map((t) => (
              <button key={t.id} className="tab" data-active={tab === t.id} onClick={() => setTab(t.id)}
                style={t.id === 'ai' ? { color: tab === 'ai' ? 'var(--accent)' : undefined } : undefined}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Notes */}
          {tab === 'notes' && (
            <div className="col gap-16" style={{ maxWidth: 720 }}>
              <div className="card" style={{ padding: 16 }}>
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Anote uma ideia, pergunta ou link…" style={{ width: '100%', border: 0, background: 'transparent', resize: 'none', minHeight: 60, font: 'inherit', color: 'inherit', outline: 'none', padding: 0 }} />
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                  {bunnyEmbedUrl && (
                    <span className="muted" style={{ fontSize: 11.5 }}>O tempo atual do vídeo é salvo junto com a nota.</span>
                  )}
                  <button className="btn btn-accent btn-sm" onClick={handleAddNote} style={{ marginLeft: 'auto' }}>Salvar nota</button>
                </div>
              </div>
              <div className="col gap-8">
                {notes.map((n) => (
                  <div key={n.id} className="card" style={{ padding: 16 }}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                      {n.timestamp && /^\d+$/.test(n.timestamp) && bunnyEmbedUrl ? (
                        <button
                          type="button"
                          className="chip mono"
                          onClick={() => playerRef.current?.seekTo(parseInt(n.timestamp!, 10))}
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)', border: 0, cursor: 'pointer' }}
                          title="Ir para este ponto do vídeo"
                        >
                          <Icon name="play" size={9} /> {fmtTime(parseInt(n.timestamp, 10))}
                        </button>
                      ) : n.timestamp ? (
                        <div className="chip mono" style={{ background: 'var(--bg-muted)' }}><Icon name="play" size={9} /> {n.timestamp}</div>
                      ) : <span />}
                      <span className="muted" style={{ fontSize: 11.5 }}>{new Date(n.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.55 }}>{n.text}</div>
                  </div>
                ))}
                {notes.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Nenhuma nota ainda. Comece anotando!</p>}
              </div>
            </div>
          )}

          {/* Comments */}
          {tab === 'comments' && (
            <div className="col gap-16" style={{ maxWidth: 720 }}>
              <CommentComposer
                text={commentText}
                onChangeText={setCommentText}
                image={commentImage}
                onChangeImage={setCommentImage}
                uploading={commentUploading}
                setUploading={setCommentUploading}
                uploadFile={uploadCommentImage}
                placeholder="Compartilhe uma reflexão ou dúvida sobre esta aula… (cole um print com Ctrl+V)"
                submitLabel="Comentar"
                onSubmit={handleAddComment}
              />
              {buildCommentTree(comments).map((c) => (
                <CommentThread
                  key={c.id}
                  comment={c}
                  depth={0}
                  replyingTo={replyingTo}
                  replyText={replyText}
                  replyImage={replyImage}
                  replyUploading={replyUploading}
                  setReplyUploading={setReplyUploading}
                  uploadFile={uploadCommentImage}
                  onStartReply={(id) => { setReplyingTo(id); setReplyText(''); setReplyImage(null); }}
                  onCancelReply={() => { setReplyingTo(null); setReplyText(''); setReplyImage(null); }}
                  onChangeReply={setReplyText}
                  onChangeReplyImage={setReplyImage}
                  onSubmitReply={handleReply}
                  onDelete={handleDeleteComment}
                />
              ))}
              {comments.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Seja o primeiro a comentar.</p>}
            </div>
          )}

          {/* Material */}
          {tab === 'material' && (
            <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {lesson.content?.trim() && (
                <div className="card prose-content" style={{ padding: 28, fontSize: 14.5, lineHeight: 1.75 }}>
                  <MarkdownRenderer source={lesson.content} />
                </div>
              )}
              {data.materials && data.materials.length > 0 && (
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Arquivos para download</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.materials.map((m) => (
                      <a
                        key={m.id}
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="row"
                        style={{
                          padding: '12px 14px',
                          background: 'var(--bg-muted)',
                          borderRadius: 8,
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          textDecoration: 'none',
                          color: 'var(--text)',
                          gap: 12,
                        }}
                      >
                        <div className="row gap-12" style={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 7, background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>
                            {m.type}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                            <div className="mono muted" style={{ fontSize: 11 }}>{m.size}</div>
                          </div>
                        </div>
                        <Icon name="download" size={15} style={{ color: 'var(--text-muted)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transcript */}
          {tab === 'transcript' && (
            <div className="card" style={{ padding: 28, maxWidth: 720, lineHeight: 1.75, fontSize: 14.5 }}>
              {lesson.transcript ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>{lesson.transcript}</div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)' }}>
                  <Icon name="chat" size={32} />
                  <p className="muted" style={{ marginTop: 12 }}>Transcrição não disponível para esta aula.</p>
                </div>
              )}
            </div>
          )}

          {/* AI Summary */}
          {tab === 'summary' && (
            <div className="card" style={{ padding: 28, maxWidth: 720 }}>
              {lesson.aiSummary ? (
                <>
                  <div className="row gap-8" style={{ marginBottom: 16, alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center' }}>
                      <Icon name="spark" size={14} style={{ color: 'var(--accent)' }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Resumo gerado com IA</span>
                  </div>
                  <div style={{ fontSize: 14.5, lineHeight: 1.75, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{lesson.aiSummary}</div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)' }}>
                  <Icon name="spark" size={32} />
                  <p className="muted" style={{ marginTop: 12 }}>Resumo ainda não disponível para esta aula.</p>
                  <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>O administrador pode gerar um resumo com IA no painel admin.</p>
                </div>
              )}
            </div>
          )}

          {/* AI Chat */}
          {tab === 'ai' && (
            <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ borderRadius: '12px 12px 0 0', border: '1px solid var(--border)', borderBottom: 0, padding: '14px 20px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="spark" size={14} style={{ color: 'white' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>Assistente IA</div>
                  <div className="muted" style={{ fontSize: 11.5 }}>Tire dúvidas sobre "{lesson.title}"</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ border: '1px solid var(--border)', borderBottom: 0, minHeight: 320, maxHeight: 480, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg)' }}>
                {chatMessages.length === 0 && (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-faint)', padding: '24px 0' }}>
                    <Icon name="spark" size={28} />
                    <p style={{ fontSize: 13, marginTop: 10, color: 'var(--text-muted)' }}>Faça uma pergunta sobre o conteúdo desta aula.</p>
                    <div className="col gap-8" style={{ marginTop: 16 }}>
                      {['O que foi explicado nesta aula?', 'Me dê um exemplo prático do conteúdo.', 'Quais são os pontos principais?'].map((s) => (
                        <button key={s} className="btn btn-soft btn-sm" style={{ fontSize: 12 }}
                          onClick={() => { setChatInput(s); }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0, marginRight: 8, alignSelf: 'flex-start', marginTop: 2 }}>
                        <Icon name="spark" size={12} style={{ color: 'white' }} />
                      </div>
                    )}
                    <div style={{
                      maxWidth: '80%', padding: '10px 14px', borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: msg.role === 'user' ? 'white' : 'var(--text)',
                      border: msg.role === 'assistant' ? '1px solid var(--border)' : undefined,
                      fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content || (chatStreaming && i === chatMessages.length - 1 ? <span style={{ opacity: 0.5 }}>▋</span> : '')}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '0 0 12px 12px', padding: '12px 16px', background: 'var(--bg-elevated)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
                  placeholder="Faça uma pergunta… (Enter para enviar)"
                  style={{ flex: 1, border: 0, background: 'transparent', resize: 'none', minHeight: 36, maxHeight: 120, font: 'inherit', fontSize: 14, color: 'inherit', outline: 'none', padding: 0, lineHeight: 1.5 }}
                  rows={1}
                />
                <button
                  onClick={handleChatSend}
                  disabled={chatStreaming || !chatInput.trim()}
                  style={{ width: 36, height: 36, borderRadius: 8, background: chatInput.trim() ? 'var(--accent)' : 'var(--bg-muted)', border: 0, cursor: chatInput.trim() ? 'pointer' : 'default', display: 'grid', placeItems: 'center', flexShrink: 0, transition: 'background 0.15s' }}
                >
                  <Icon name="arrow-right" size={16} style={{ color: chatInput.trim() ? 'white' : 'var(--text-faint)' }} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Course outline sidebar */}
        <aside className="lesson-outline" style={{ position: 'sticky', top: 80, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-elevated)' }}>
          <div style={{ padding: 18, borderBottom: '1px solid var(--border)' }}>
            <div className="eyebrow">Conteúdo do curso</div>
            <div className="h3 mt-8" style={{ letterSpacing: '-0.01em' }}>{course.title}</div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <span className="muted mono" style={{ fontSize: 11.5 }}>{course.lessonCount} aulas</span>
              <span className="muted mono" style={{ fontSize: 11.5 }}>{donePct}%</span>
            </div>
            <div className="mt-8 progress progress-accent">
              <div className="progress-fill" style={{ width: `${donePct}%` }} />
            </div>
          </div>
          <div>
            {outline.map((m, mi) => (
              <div key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => setOpenModules((p) => { const n = new Set(p); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n; })}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 18px', background: 'transparent', border: 0, textAlign: 'left', color: 'inherit', cursor: 'pointer' }}
                >
                  <span className="mono" style={{ fontSize: 18, color: 'var(--text-faint)', minWidth: 28 }}>{String(mi + 1).padStart(2, '0')}</span>
                  <div className="grow">
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                    <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>{m.lessons.length} aulas · {m.duration}</div>
                  </div>
                  <Icon name={openModules.has(m.id) ? 'chevron-up' : 'chevron-down'} size={15} style={{ color: 'var(--text-faint)' }} />
                </button>
                {openModules.has(m.id) && (
                  <div style={{ paddingBottom: 6 }}>
                    {m.lessons.map((l) => (
                      <Link
                        key={l.id}
                        href={`/courses/${course.id}/lessons/${l.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 18px 8px 24px', background: l.id === lesson.id ? 'var(--accent-soft)' : 'transparent', color: l.id === lesson.id ? 'var(--accent-soft-fg)' : 'inherit', textDecoration: 'none' }}
                      >
                        <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center', background: l.done ? 'var(--success)' : (l.id === lesson.id ? 'var(--accent)' : 'var(--bg-muted)'), color: l.done || l.id === lesson.id ? 'white' : 'var(--text-faint)', flexShrink: 0 }}>
                          {l.done ? <Icon name="check" size={11} /> : l.type === 'quiz' ? <Icon name="brain" size={10} /> : <Icon name="play" size={9} />}
                        </div>
                        <span style={{ fontSize: 12.5, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: l.id === lesson.id ? 600 : 400 }}>{l.title}</span>
                        <span className="mono" style={{ fontSize: 10.5, opacity: 0.6 }}>{l.duration}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

type ThreadedComment = Comment & { children: ThreadedComment[] };

function buildCommentTree(flat: Comment[]): ThreadedComment[] {
  const byId = new Map<string, ThreadedComment>();
  for (const c of flat) byId.set(c.id, { ...c, children: [] });
  const roots: ThreadedComment[] = [];
  for (const c of byId.values()) {
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.children.push(c);
    } else {
      roots.push(c);
    }
  }
  return roots;
}

type ThreadProps = {
  comment: ThreadedComment;
  depth: number;
  replyingTo: string | null;
  replyText: string;
  replyImage: string | null;
  replyUploading: boolean;
  setReplyUploading: (v: boolean) => void;
  uploadFile: (file: File) => Promise<string | null>;
  onStartReply: (id: string) => void;
  onCancelReply: () => void;
  onChangeReply: (v: string) => void;
  onChangeReplyImage: (v: string | null) => void;
  onSubmitReply: (parentId: string) => void;
  onDelete: (id: string) => void;
};

function CommentThread(props: ThreadProps) {
  const { comment, depth, replyingTo, onStartReply, onCancelReply, onDelete } = props;
  const indent = depth > 0 ? Math.min(depth, 4) * 28 : 0;
  const isReplying = replyingTo === comment.id;

  return (
    <div style={{ marginLeft: indent }}>
      <div
        className="card"
        style={{
          padding: 16,
          position: 'relative',
          borderLeft: depth > 0 ? '2px solid var(--border-strong)' : undefined,
        }}
      >
        <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
          <div
            className="avatar"
            style={{
              background: comment.isInstructor ? 'var(--accent)' : 'var(--bg-muted)',
              color: comment.isInstructor ? 'var(--accent-fg)' : 'var(--text)',
              flexShrink: 0,
            }}
          >
            {comment.avatar}
          </div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 13.5 }}>{comment.author}</span>
              {comment.isInstructor && <span className="chip chip-accent" style={{ fontSize: 10 }}>Instrutor</span>}
              <span className="muted" style={{ fontSize: 12 }}>{new Date(comment.createdAt).toLocaleDateString('pt-BR')}</span>
            </div>
            {comment.text && (
              <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{comment.text}</p>
            )}
            {comment.imageUrl && (
              <a href={comment.imageUrl} target="_blank" rel="noopener" style={{ display: 'inline-block', marginTop: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={comment.imageUrl}
                  alt="Anexo"
                  style={{ maxWidth: '100%', maxHeight: 360, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }}
                />
              </a>
            )}
            <div className="row gap-12" style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => (isReplying ? onCancelReply() : onStartReply(comment.id))}
                style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
              >
                {isReplying ? 'Cancelar' : 'Responder'}
              </button>
              {comment.isOwn && (
                <button
                  type="button"
                  onClick={() => onDelete(comment.id)}
                  style={{ background: 'transparent', border: 0, padding: 0, color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        </div>

        {isReplying && (
          <div style={{ marginTop: 12 }}>
            <CommentComposer
              text={props.replyText}
              onChangeText={props.onChangeReply}
              image={props.replyImage}
              onChangeImage={props.onChangeReplyImage}
              uploading={props.replyUploading}
              setUploading={props.setReplyUploading}
              uploadFile={props.uploadFile}
              placeholder={`Respondendo a ${comment.author}… (cole um print com Ctrl+V)`}
              submitLabel="Responder"
              onSubmit={() => props.onSubmitReply(comment.id)}
              onCancel={onCancelReply}
              variant="inline"
            />
          </div>
        )}
      </div>

      {comment.children.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comment.children.map((child) => (
            <CommentThread {...props} key={child.id} comment={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentComposer({
  text,
  onChangeText,
  image,
  onChangeImage,
  uploading,
  setUploading,
  uploadFile,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
  variant = 'card',
}: {
  text: string;
  onChangeText: (v: string) => void;
  image: string | null;
  onChangeImage: (v: string | null) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  uploadFile: (file: File) => Promise<string | null>;
  placeholder: string;
  submitLabel: string;
  onSubmit: () => void;
  onCancel?: () => void;
  variant?: 'card' | 'inline';
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | File[] | null) {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (arr.length === 0) return;
    setUploading(true);
    const url = await uploadFile(arr[0]);
    setUploading(false);
    if (url) onChangeImage(url);
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imgItem = items.find((it) => it.type.startsWith('image/'));
    if (!imgItem) return;
    const file = imgItem.getAsFile();
    if (file) {
      e.preventDefault();
      handleFiles([file]);
    }
  }

  const wrapStyle = variant === 'card'
    ? { padding: 16 }
    : { padding: '12px 14px', background: 'var(--bg-muted)', borderRadius: 10 };

  return (
    <div className={variant === 'card' ? 'card' : ''} style={wrapStyle}>
      <textarea
        value={text}
        onChange={(e) => onChangeText(e.target.value)}
        onPaste={handlePaste}
        placeholder={placeholder}
        autoFocus={variant === 'inline'}
        style={{ width: '100%', border: 0, background: 'transparent', resize: 'none', minHeight: 60, font: 'inherit', color: 'inherit', outline: 'none', padding: 0 }}
      />
      {image && (
        <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Pré-visualização"
            style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, border: '1px solid var(--border)', display: 'block' }}
          />
          <button
            type="button"
            onClick={() => onChangeImage(null)}
            title="Remover imagem"
            style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', color: '#fff', border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 14, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}
      {uploading && (
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Enviando imagem…</div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        style={{ display: 'none' }}
      />
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 10, alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Anexar imagem"
          style={{ background: 'transparent', border: 0, padding: '4px 8px', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          Anexar imagem
        </button>
        <div className="row gap-8">
          {onCancel && <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>}
          <button
            type="button"
            className="btn btn-accent btn-sm"
            disabled={uploading || (!text.trim() && !image)}
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="content content-wide" style={{ maxWidth: '100%', padding: '24px 32px' }}>
      <div className="row gap-8" style={{ marginBottom: 20 }}>
        <div className="skel" style={{ height: 14, width: 80 }} />
        <div className="skel" style={{ height: 14, width: 140 }} />
        <div className="skel" style={{ height: 14, width: 200 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24 }}>
        <div style={{ minWidth: 0 }}>
          <div className="skel" style={{ aspectRatio: '16 / 9', borderRadius: 14, marginBottom: 16 }} />
          <div className="skel" style={{ height: 28, width: '70%', marginBottom: 10 }} />
          <div className="skel" style={{ height: 16, width: '40%', marginBottom: 24 }} />
          <div className="row gap-8" style={{ marginBottom: 20 }}>
            <div className="skel" style={{ height: 34, width: 110, borderRadius: 999 }} />
            <div className="skel" style={{ height: 34, width: 130, borderRadius: 999 }} />
            <div className="skel" style={{ height: 34, width: 90, borderRadius: 999 }} />
          </div>
          <div className="skel" style={{ height: 200, width: '100%' }} />
        </div>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skel" style={{ height: 48, width: '100%' }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ padding: '10px 0' }}>
              <div className="skel" style={{ height: 18, width: '60%', marginBottom: 10 }} />
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="row gap-8" style={{ marginBottom: 8, paddingLeft: 18 }}>
                  <div className="skel" style={{ height: 22, width: 22, borderRadius: '50%' }} />
                  <div className="skel" style={{ height: 14, flex: 1 }} />
                  <div className="skel" style={{ height: 12, width: 38 }} />
                </div>
              ))}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

function Celebration() {
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#a855f7', '#06b6d4'];
  const pieces = Array.from({ length: 36 }, (_, i) => {
    const angle = (i / 36) * Math.PI * 2;
    const distance = 140 + Math.random() * 120;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    const rot = (Math.random() * 720 - 360) + 'deg';
    const color = colors[i % colors.length];
    const delay = Math.random() * 80;
    return { dx, dy, rot, color, delay, key: i };
  });
  return (
    <div className="celebrate" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.key}
          className="celebrate-piece"
          style={{
            background: p.color,
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--rot' as string]: p.rot,
            animationDelay: `${p.delay}ms`,
          } as React.CSSProperties}
        />
      ))}
      <div className="celebrate-badge">
        <span style={{ fontSize: 18 }}>✓</span>
        Aula concluída!
      </div>
    </div>
  );
}

function urlToEmbed(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  if (/^https?:\/\//.test(url)) return url;
  return null;
}
