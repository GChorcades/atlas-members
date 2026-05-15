'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { SortableList } from '@/components/sortable-list';
import {
  adminUpdateCourse,
  adminToggleCoursePublished,
  adminCreateModule,
  adminUpdateModule,
  adminDeleteModule,
  adminReorderModules,
  adminReorderLessons,
  adminCreateLesson,
  adminUpdateLessonTitle,
  adminDeleteLesson,
} from '@/lib/actions';
import { DetailSkeleton } from '@/components/skeleton';

type Lesson = {
  id: string; title: string; type: string; duration: string | null;
  position: number; published: boolean;
  hasVideo: boolean; hasTranscript: boolean; hasSummary: boolean;
};

type Module = {
  id: string; title: string; duration: string | null; position: number;
  lessons: Lesson[];
};

type Course = {
  id: string; title: string; subtitle: string | null; description: string | null;
  instructor: string; instructorRole: string | null; level: string;
  duration: string | null; coverBg: string | null; coverImage: string | null;
  coverGlyph: string | null; coverAccent: string | null;
  students: number;
  published: boolean;
};

type CourseData = { course: Course; modules: Module[] };

export default function EditCoursePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CourseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'info' | 'content'>('info');
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/courses/${params.id}`);
    const d: CourseData = await res.json();
    setData(d);
    setCoverImageUrl(d.course.coverImage ?? '');
    setImagePreview(d.course.coverImage ?? null);
  }, [params.id]);

  useEffect(() => { refresh(); }, [refresh]);

  function close() {
    router.back();
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const d = await res.json();
    setUploading(false);
    if (d.url) {
      setCoverImageUrl(d.url);
      setImagePreview(d.url);
    } else {
      alert(d.error ?? 'Erro no upload');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    await adminUpdateCourse(data.course.id, {
      title: fd.get('title') as string,
      subtitle: (fd.get('subtitle') as string) || null,
      description: (fd.get('description') as string) || null,
      instructor: fd.get('instructor') as string,
      instructorRole: (fd.get('instructorRole') as string) || null,
      level: fd.get('level') as string,
      duration: (fd.get('duration') as string) || null,
      students: Math.max(0, parseInt(String(fd.get('students') ?? '0'), 10) || 0),
      coverBg: (fd.get('coverBg') as string) || null,
      coverImage: coverImageUrl || null,
      coverGlyph: (fd.get('coverGlyph') as string) || null,
      coverAccent: (fd.get('coverAccent') as string) || null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => router.back(), 600);
  }

  // ── Module operations ─────────────────────────────────────────
  async function handleAddModule() {
    if (!data) return;
    const title = prompt('Nome do novo módulo:');
    if (!title?.trim()) return;
    await adminCreateModule(data.course.id, title.trim());
    refresh();
  }

  async function handleUpdateModuleTitle(moduleId: string, title: string) {
    await adminUpdateModule(moduleId, { title });
    refresh();
  }

  async function handleDeleteModule(moduleId: string, title: string) {
    if (!confirm(`Excluir o módulo "${title}"? Todas as aulas dele serão removidas.`)) return;
    await adminDeleteModule(moduleId);
    refresh();
  }

  async function handleReorderModules(newOrder: Module[]) {
    if (!data) return;
    setData({ ...data, modules: newOrder });
    await adminReorderModules(data.course.id, newOrder.map((m) => m.id));
  }

  // ── Lesson operations ─────────────────────────────────────────
  async function handleAddLesson(moduleId: string) {
    const title = prompt('Título da nova aula:');
    if (!title?.trim()) return;
    await adminCreateLesson(moduleId, { title: title.trim() });
    refresh();
  }

  async function handleUpdateLessonTitle(lessonId: string, title: string) {
    await adminUpdateLessonTitle(lessonId, title);
    refresh();
  }

  async function handleDeleteLesson(lessonId: string, title: string) {
    if (!confirm(`Excluir a aula "${title}"?`)) return;
    await adminDeleteLesson(lessonId);
    refresh();
  }

  async function handleReorderLessons(moduleId: string, newOrder: Lesson[]) {
    if (!data) return;
    const updatedModules = data.modules.map((m) =>
      m.id === moduleId ? { ...m, lessons: newOrder } : m
    );
    setData({ ...data, modules: updatedModules });
    await adminReorderLessons(moduleId, newOrder.map((l) => l.id));
  }

  if (!data) return <DetailSkeleton />;

  const { course, modules } = data;
  const coverBgVal = course.coverBg ?? '';
  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Header */}
      <div className="row" style={{ alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <button className="icon-btn" onClick={close} title="Voltar">
          <Icon name="arrow-left" size={16} />
        </button>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: imagePreview ? `url(${imagePreview}) center/cover` : (coverBgVal || '#1e1b4b'), display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--font-display)', fontSize: 16, flexShrink: 0 }}>
          {!imagePreview && course.coverGlyph}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="h2" style={{ marginBottom: 2, fontSize: 22 }}>{course.title}</h2>
          <p className="muted" style={{ fontSize: 13 }}>{modules.length} módulos · {totalLessons} aulas</p>
        </div>
        <CourseStatusBadge published={course.published} />
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button type="button" className="tab" data-active={tab === 'info'} onClick={() => setTab('info')}>Informações</button>
        <button type="button" className="tab" data-active={tab === 'content'} onClick={() => setTab('content')}>Conteúdo ({totalLessons})</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {tab === 'info' && (
          <>
            {/* Imagem de capa */}
            <div className="card" style={{ padding: 24 }}>
              <p className="field-label" style={{ marginBottom: 12 }}>Imagem de capa</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'flex-start' }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }}
                  style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 24, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-muted)' }}
                >
                  {uploading ? (
                    <div className="col gap-8" style={{ alignItems: 'center' }}>
                      <Icon name="download" size={24} style={{ color: 'var(--text-faint)' }} />
                      <span className="muted" style={{ fontSize: 13 }}>Enviando…</span>
                    </div>
                  ) : imagePreview ? (
                    <div className="col gap-8" style={{ alignItems: 'center' }}>
                      <img src={imagePreview} alt="preview" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }} />
                      <span className="muted" style={{ fontSize: 11 }}>Clique para trocar</span>
                    </div>
                  ) : (
                    <div className="col gap-8" style={{ alignItems: 'center' }}>
                      <Icon name="download" size={28} style={{ color: 'var(--text-faint)' }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Soltar imagem aqui</span>
                      <span className="muted" style={{ fontSize: 11 }}>JPG, PNG, WEBP · máx 5 MB</span>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                </div>

                <div className="col gap-12">
                  <div className="field-group">
                    <label className="field-label">Ou usar gradiente CSS</label>
                    <input name="coverBg" className="input-field" defaultValue={coverBgVal} placeholder="linear-gradient(135deg, #1e1b4b, #4338ca)" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="field-group">
                      <label className="field-label">Símbolo</label>
                      <input name="coverGlyph" className="input-field" maxLength={4} defaultValue={course.coverGlyph ?? ''} placeholder="MD" />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Cor destaque</label>
                      <input name="coverAccent" className="input-field" defaultValue={course.coverAccent ?? ''} placeholder="#a5b4fc" />
                    </div>
                  </div>
                </div>
              </div>
              {coverImageUrl && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12, color: 'var(--danger)' }}
                  onClick={() => { setCoverImageUrl(''); setImagePreview(null); }}>
                  <Icon name="trash" size={12} /> Remover imagem
                </button>
              )}
            </div>

            {/* Informações do curso */}
            <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Informações do curso</p>
              <div className="field-group">
                <label className="field-label">Título *</label>
                <input name="title" required className="input-field" defaultValue={course.title} />
              </div>
              <div className="field-group">
                <label className="field-label">Subtítulo</label>
                <input name="subtitle" className="input-field" defaultValue={course.subtitle ?? ''} />
              </div>
              <div className="field-group">
                <label className="field-label">Descrição</label>
                <textarea name="description" className="input-field" rows={4} defaultValue={course.description ?? ''} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="field-group">
                  <label className="field-label">Instrutor *</label>
                  <input name="instructor" required className="input-field" defaultValue={course.instructor} />
                </div>
                <div className="field-group">
                  <label className="field-label">Cargo do instrutor</label>
                  <input name="instructorRole" className="input-field" defaultValue={course.instructorRole ?? ''} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="field-group">
                  <label className="field-label">Nível</label>
                  <select name="level" className="input-field" defaultValue={course.level}>
                    <option>Iniciante</option>
                    <option>Intermediário</option>
                    <option>Avançado</option>
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Duração total</label>
                  <input name="duration" className="input-field" defaultValue={course.duration ?? ''} placeholder="ex: 14h 12min" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="field-group">
                  <label className="field-label">Quantidade de alunos (exibida)</label>
                  <input name="students" type="number" min={0} className="input-field" defaultValue={course.students} placeholder="ex: 1240" />
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'content' && (
          <div className="col gap-14">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <p className="muted" style={{ fontSize: 13 }}>Arraste os módulos e aulas para reordenar.</p>
              <button type="button" className="btn btn-accent btn-sm" onClick={handleAddModule}>
                <Icon name="plus" size={13} /> Novo módulo
              </button>
            </div>

            {modules.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <Icon name="courses" size={32} style={{ color: 'var(--text-faint)', margin: '0 auto 12px' }} />
                <p className="muted" style={{ fontSize: 13 }}>Nenhum módulo ainda. Adicione o primeiro para começar.</p>
              </div>
            ) : (
              <SortableList
                items={modules}
                onReorder={handleReorderModules}
                renderItem={(mod, dragHandle) => (
                  <ModuleCard
                    key={mod.id}
                    courseId={course.id}
                    module={mod}
                    dragHandle={dragHandle}
                    onUpdateTitle={(title) => handleUpdateModuleTitle(mod.id, title)}
                    onDelete={() => handleDeleteModule(mod.id, mod.title)}
                    onAddLesson={() => handleAddLesson(mod.id)}
                    onReorderLessons={(newOrder) => handleReorderLessons(mod.id, newOrder)}
                    onUpdateLessonTitle={handleUpdateLessonTitle}
                    onDeleteLesson={handleDeleteLesson}
                  />
                )}
              />
            )}
          </div>
        )}

        <div
          style={{
            position: 'sticky',
            bottom: 0,
            marginTop: 16,
            padding: '14px 16px',
            background: 'var(--bg-elevated)',
            borderTop: '1px solid var(--border)',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div className="row gap-10" style={{ alignItems: 'center' }}>
            <CourseStatusBadge published={course.published} />
            <span className="muted" style={{ fontSize: 12 }}>
              {course.published ? 'Visível no catálogo dos alunos' : 'Não aparece no catálogo até ser publicado'}
            </span>
          </div>
          <div className="row gap-8">
            <button type="button" className="btn btn-ghost" onClick={close} disabled={saving}>Cancelar</button>
            {course.published ? (
              <button
                type="button"
                className="btn"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await adminToggleCoursePublished(course.id, false);
                  await refresh();
                  setSaving(false);
                }}
                style={{ background: 'var(--bg-muted)', color: 'var(--text)' }}
              >
                Despublicar
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-accent"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  await adminToggleCoursePublished(course.id, true);
                  await refresh();
                  setSaving(false);
                }}
              >
                <Icon name="check" size={14} /> Publicar curso
              </button>
            )}
            <button type="submit" disabled={saving} className="btn btn-soft">
              {saved ? <><Icon name="check" size={14} /> Salvo!</> : saving ? 'Salvando…' : <><Icon name="check" size={14} /> Salvar e voltar</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function CourseStatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className="chip"
      style={{
        background: published ? 'rgba(34, 197, 94, 0.12)' : 'rgba(250, 204, 21, 0.16)',
        color: published ? '#15803d' : '#92400e',
        fontWeight: 600,
        fontSize: 12,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: published ? '#22c55e' : '#facc15', display: 'inline-block', marginRight: 6 }} />
      {published ? 'Publicado' : 'Rascunho'}
    </span>
  );
}

// ─── Module Card ─────────────────────────────────────────────────────

type ModuleCardProps = {
  courseId: string;
  module: Module;
  dragHandle: React.ReactNode;
  onUpdateTitle: (title: string) => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onReorderLessons: (newOrder: Lesson[]) => void;
  onUpdateLessonTitle: (lessonId: string, title: string) => void;
  onDeleteLesson: (lessonId: string, title: string) => void;
};

function ModuleCard({ courseId, module, dragHandle, onUpdateTitle, onDelete, onAddLesson, onReorderLessons, onUpdateLessonTitle, onDeleteLesson }: ModuleCardProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(module.title);
  const [collapsed, setCollapsed] = useState(false);

  function saveTitle() {
    setEditingTitle(false);
    if (title.trim() && title !== module.title) onUpdateTitle(title.trim());
  }

  return (
    <div className="card-flat" style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 14, border: '1px solid var(--border)' }}>
      <div style={{ padding: '12px 16px', background: 'var(--bg-muted)', borderBottom: collapsed ? 0 : '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        {dragHandle}
        <button type="button" className="icon-btn" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expandir' : 'Recolher'}>
          <Icon name={collapsed ? 'chevron-right' : 'chevron-down'} size={14} />
        </button>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-faint)', minWidth: 24 }}>{String(module.position + 1).padStart(2, '0')}</span>
        <div className="grow">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') { setTitle(module.title); setEditingTitle(false); }
              }}
              className="input-field"
              style={{ fontSize: 14, fontWeight: 600, padding: '4px 8px', height: 32 }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              style={{ background: 'transparent', border: 0, padding: 0, fontSize: 14, fontWeight: 600, textAlign: 'left', cursor: 'text', color: 'var(--text)', width: '100%' }}
            >
              {module.title}
            </button>
          )}
        </div>
        <span className="muted" style={{ fontSize: 11.5 }}>{module.lessons.length} aulas</span>
        <button type="button" className="icon-btn" onClick={onAddLesson} title="Nova aula">
          <Icon name="plus" size={13} />
        </button>
        <button type="button" className="icon-btn" onClick={onDelete} style={{ color: 'var(--danger)' }} title="Excluir módulo">
          <Icon name="trash" size={13} />
        </button>
      </div>

      {!collapsed && (
        <div style={{ padding: '6px 0' }}>
          {module.lessons.length === 0 ? (
            <p className="muted" style={{ fontSize: 12.5, padding: '14px 20px' }}>Nenhuma aula. Clique no <Icon name="plus" size={10} /> acima para adicionar.</p>
          ) : (
            <SortableList
              items={module.lessons}
              onReorder={onReorderLessons}
              renderItem={(lesson, lessonHandle) => (
                <LessonRow
                  key={lesson.id}
                  courseId={courseId}
                  lesson={lesson}
                  dragHandle={lessonHandle}
                  onUpdateTitle={(t) => onUpdateLessonTitle(lesson.id, t)}
                  onDelete={() => onDeleteLesson(lesson.id, lesson.title)}
                />
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Lesson Row ──────────────────────────────────────────────────────

function LessonRow({ courseId, lesson, dragHandle, onUpdateTitle, onDelete }: {
  courseId: string;
  lesson: Lesson;
  dragHandle: React.ReactNode;
  onUpdateTitle: (title: string) => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);

  function saveTitle() {
    setEditing(false);
    if (title.trim() && title !== lesson.title) onUpdateTitle(title.trim());
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
      {dragHandle}
      <Icon name={lesson.type === 'quiz' ? 'brain' : 'play'} size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') { setTitle(lesson.title); setEditing(false); }
            }}
            className="input-field"
            style={{ fontSize: 13, padding: '3px 8px', height: 28 }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{ background: 'transparent', border: 0, padding: 0, fontSize: 13, fontWeight: 500, textAlign: 'left', cursor: 'text', color: 'var(--text)', width: '100%' }}
          >
            {lesson.title}
          </button>
        )}
      </div>

      <div className="row gap-4" style={{ flexShrink: 0 }}>
        {!lesson.published && <span className="chip" style={{ fontSize: 9.5 }}>Rascunho</span>}
        {lesson.hasVideo && <span className="chip chip-success" style={{ fontSize: 9.5 }}>Vídeo</span>}
        {lesson.hasTranscript && <span className="chip" style={{ fontSize: 9.5 }}>Transcrição</span>}
        {lesson.hasSummary && <span className="chip chip-accent" style={{ fontSize: 9.5 }}>IA</span>}
      </div>

      {lesson.duration && <span className="mono muted" style={{ fontSize: 11, flexShrink: 0 }}>{lesson.duration}</span>}

      <div className="row gap-2" style={{ flexShrink: 0 }}>
        <button
          type="button"
          className="icon-btn"
          onClick={() => router.push(`/admin/courses/${courseId}/lessons/${lesson.id}/edit`)}
          title="Editar conteúdo (vídeo, transcrição, IA)"
        >
          <Icon name="edit" size={13} />
        </button>
        <button type="button" className="icon-btn" onClick={onDelete} style={{ color: 'var(--danger)' }} title="Excluir aula">
          <Icon name="trash" size={12} />
        </button>
      </div>
    </div>
  );
}
