'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from './icons';

type PandaVideo = {
  id: string;
  title: string;
  duration: number;
  status: string;
  thumbnail: string | null;
  createdAt: string | null;
};

type Props = {
  currentId: string;
  onSelect: (id: string, title: string) => void;
};

function fmtDuration(seconds: number): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PandaVideoPicker({ currentId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<PandaVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PandaVideo | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const fetchVideos = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ search: q, page: String(p) });
    const res = await fetch(`/api/admin/panda/videos?${params}`);
    const data = await res.json();
    if (data.error) {
      setError(data.error);
      setVideos([]);
    } else {
      setVideos(data.videos ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchVideos(debouncedSearch, page);
  }, [open, debouncedSearch, page, fetchVideos]);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 100);
  }, [open]);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 380);
  }

  function handleConfirm() {
    if (selected) {
      onSelect(selected.id, selected.title);
      setOpen(false);
      setSelected(null);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-soft"
        onClick={() => setOpen(true)}
        style={{ gap: 8 }}
      >
        <div style={{ width: 18, height: 18, borderRadius: 5, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="play" size={10} style={{ color: '#fff' }} />
        </div>
        Selecionar vídeo do Panda
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 860, padding: 0, overflow: 'hidden', borderRadius: 14 }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon name="play" size={14} style={{ color: '#fff' }} />
              </div>
              <div className="grow">
                <div style={{ fontWeight: 700, fontSize: 15 }}>Biblioteca Panda Video</div>
                <div className="muted" style={{ fontSize: 12 }}>{total} vídeos na biblioteca</div>
              </div>
              <button className="icon-btn" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button>
            </div>

            {/* Search */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-muted)' }}>
              <div style={{ position: 'relative' }}>
                <Icon name="search" size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar vídeos por título…"
                  className="input-field"
                  style={{ paddingLeft: 36, paddingRight: search ? 36 : 12 }}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-faint)', display: 'grid', placeItems: 'center' }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Video grid */}
            <div style={{ padding: 20, minHeight: 420, maxHeight: '60vh', overflowY: 'auto' }}>
              {error ? (
                <div style={{ display: 'grid', placeItems: 'center', height: 300 }}>
                  <div className="col gap-10" style={{ alignItems: 'center', textAlign: 'center' }}>
                    <Icon name="x" size={32} style={{ color: 'var(--danger)' }} />
                    <span style={{ fontSize: 13, color: 'var(--danger)' }}>{error}</span>
                  </div>
                </div>
              ) : loading ? (
                <div style={{ display: 'grid', placeItems: 'center', height: 300 }}>
                  <div className="col gap-12" style={{ alignItems: 'center', color: 'var(--text-faint)' }}>
                    <Icon name="spark" size={28} />
                    <span className="muted" style={{ fontSize: 13 }}>Carregando vídeos…</span>
                  </div>
                </div>
              ) : videos.length === 0 ? (
                <div style={{ display: 'grid', placeItems: 'center', height: 300 }}>
                  <div className="col gap-10" style={{ alignItems: 'center', color: 'var(--text-faint)' }}>
                    <Icon name="play-circle" size={32} />
                    <span className="muted" style={{ fontSize: 13 }}>
                      {search ? `Nenhum vídeo encontrado para "${search}"` : 'Nenhum vídeo na biblioteca.'}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                  {videos.map((v) => {
                    const isCurrent = v.id === currentId;
                    const isSelected = selected?.id === v.id;
                    const dur = fmtDuration(v.duration);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelected(v)}
                        style={{
                          border: `2px solid ${isSelected ? 'var(--accent)' : isCurrent ? 'var(--success)' : 'var(--border)'}`,
                          borderRadius: 10,
                          background: isSelected ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                          padding: 0,
                          cursor: 'pointer',
                          textAlign: 'left',
                          overflow: 'hidden',
                          transition: 'border-color 0.15s, background 0.15s',
                          position: 'relative',
                        }}
                      >
                        {/* Thumbnail */}
                        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#0a0a0a', overflow: 'hidden' }}>
                          {v.thumbnail ? (
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: '#1a1a1a' }}>
                              <Icon name="play" size={22} style={{ color: 'rgba(255,255,255,0.2)' }} />
                            </div>
                          )}
                          {dur && (
                            <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.75)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                              {dur}
                            </div>
                          )}
                          {isSelected && (
                            <div style={{ position: 'absolute', top: 6, left: 6, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                              <Icon name="check" size={12} style={{ color: 'white' }} />
                            </div>
                          )}
                          {isCurrent && !isSelected && (
                            <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--success)', color: 'white', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>
                              ATUAL
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div style={{ padding: '10px 12px 12px' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', color: isSelected ? 'var(--accent-soft-fg)' : 'var(--text)' }}>
                            {v.title}
                          </div>
                          {v.createdAt && (
                            <div className="muted" style={{ fontSize: 11, marginTop: 5 }}>
                              {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination + footer */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <div className="row gap-6">
                <button type="button" className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <Icon name="arrow-left" size={13} />
                </button>
                <span className="muted" style={{ fontSize: 12, minWidth: 80, textAlign: 'center' }}>
                  {loading ? '…' : `${page} / ${Math.max(totalPages, 1)}`}
                </span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                  <Icon name="arrow-right" size={13} />
                </button>
              </div>

              <div className="row gap-8">
                <button type="button" className="btn btn-ghost" onClick={() => { setOpen(false); setSelected(null); }}>Cancelar</button>
                <button type="button" className="btn btn-accent" disabled={!selected} onClick={handleConfirm}>
                  <Icon name="check" size={14} /> Usar este vídeo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
