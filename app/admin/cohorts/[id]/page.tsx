'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { adminUpdateCohort, adminSetCohortCourses, adminSetCohortMembers } from '@/lib/actions';
import { DetailSkeleton } from '@/components/skeleton';

type CourseItem = { id: string; title: string; published: boolean; linked: boolean };
type MemberItem = { id: string; name: string; email: string; role: string; linked: boolean };

type CohortData = {
  cohort: { id: string; name: string; description: string | null; color: string | null };
  courses: CourseItem[];
  members: MemberItem[];
};

const COLOR_OPTIONS = [
  { value: '#6366f1', label: 'Índigo' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#06b6d4', label: 'Ciano' },
];

export default function EditCohortPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CohortData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'info' | 'courses' | 'members'>('info');
  const [courseSearch, setCourseSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [pickedCourses, setPickedCourses] = useState<Set<string>>(new Set());
  const [pickedMembers, setPickedMembers] = useState<Set<string>>(new Set());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');

  useEffect(() => {
    fetch(`/api/admin/cohorts/${params.id}`)
      .then((r) => r.json())
      .then((d: CohortData) => {
        setData(d);
        setPickedCourses(new Set(d.courses.filter((c) => c.linked).map((c) => c.id)));
        setPickedMembers(new Set(d.members.filter((m) => m.linked).map((m) => m.id)));
        setName(d.cohort.name);
        setDescription(d.cohort.description ?? '');
        setColor(d.cohort.color ?? '#6366f1');
      });
  }, [params.id]);

  function close() {
    router.back();
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    if (!name.trim()) {
      alert('Nome da turma é obrigatório');
      setTab('info');
      return;
    }
    setSaving(true);
    await adminUpdateCohort(data.cohort.id, {
      name: name.trim(),
      description: description || undefined,
      color: color || undefined,
    });
    await adminSetCohortCourses(data.cohort.id, Array.from(pickedCourses));
    await adminSetCohortMembers(data.cohort.id, Array.from(pickedMembers));
    setSaving(false);
    setSaved(true);
    setTimeout(() => router.back(), 600);
  }

  function toggleCourse(id: string) {
    setPickedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleMember(id: string) {
    setPickedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (!data) return <DetailSkeleton />;

  const filteredCourses = data.courses.filter((c) => !courseSearch || c.title.toLowerCase().includes(courseSearch.toLowerCase()));
  const filteredMembers = data.members.filter((m) =>
    !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Header */}
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div className="row gap-14" style={{ alignItems: 'center' }}>
          <button className="icon-btn" onClick={close} title="Voltar">
            <Icon name="arrow-left" size={16} />
          </button>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: color ?? 'var(--accent-soft)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16 }}>
            {(name || data.cohort.name)[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="h2" style={{ marginBottom: 2 }}>{name || data.cohort.name}</h2>
            <p className="muted" style={{ fontSize: 13 }}>{pickedCourses.size} cursos · {pickedMembers.size} alunos</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button type="button" className="tab" data-active={tab === 'info'} onClick={() => setTab('info')}>Informações</button>
        <button type="button" className="tab" data-active={tab === 'courses'} onClick={() => setTab('courses')}>Cursos ({pickedCourses.size})</button>
        <button type="button" className="tab" data-active={tab === 'members'} onClick={() => setTab('members')}>Alunos ({pickedMembers.size})</button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {tab === 'info' && (
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field-group">
              <label className="field-label">Nome da turma *</label>
              <input
                required
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label className="field-label">Descrição</label>
              <textarea
                className="input-field"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ex: Turma de novembro/2026 — formação completa em marketing"
              />
            </div>

            <div className="field-group">
              <label className="field-label">Cor</label>
              <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.label}
                    style={{
                      width: 32, height: 32, borderRadius: 8, background: c.value,
                      border: `2px solid ${color === c.value ? 'var(--text)' : 'transparent'}`,
                      boxShadow: color === c.value ? '0 0 0 2px var(--bg)' : 'none',
                      cursor: 'pointer', padding: 0, transition: 'all 0.12s',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'courses' && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Cursos liberados para esta turma</p>
              <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>Os alunos da turma terão acesso automático aos cursos selecionados.</p>
            </div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Icon name="search" size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} placeholder="Buscar cursos…" className="input-field" style={{ paddingLeft: 33 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
              {filteredCourses.map((course) => {
                const linked = pickedCourses.has(course.id);
                return (
                  <label key={course.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${linked ? 'var(--accent)' : 'var(--border)'}`, background: linked ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer' }}>
                    <input type="checkbox" checked={linked} onChange={() => toggleCourse(course.id)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: linked ? 'var(--accent-soft-fg)' : 'var(--text)' }}>{course.title}</div>
                    </div>
                    {!course.published && <span className="chip" style={{ fontSize: 10 }}>Rascunho</span>}
                  </label>
                );
              })}
              {filteredCourses.length === 0 && (
                <p className="muted" style={{ fontSize: 13, padding: 12 }}>Nenhum curso encontrado.</p>
              )}
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="card" style={{ padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 600, fontSize: 14 }}>Alunos desta turma</p>
              <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>Adicione ou remova alunos da turma.</p>
            </div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Icon name="search" size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
              <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Buscar por nome ou e-mail…" className="input-field" style={{ paddingLeft: 33 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
              {filteredMembers.map((member) => {
                const linked = pickedMembers.has(member.id);
                return (
                  <label key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 9, border: `1.5px solid ${linked ? 'var(--accent)' : 'var(--border)'}`, background: linked ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer' }}>
                    <input type="checkbox" checked={linked} onChange={() => toggleMember(member.id)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: member.role === 'admin' ? 'var(--accent)' : 'var(--bg-muted)' }}>{member.name[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{member.name}</div>
                      <div className="muted" style={{ fontSize: 11.5 }}>{member.email}</div>
                    </div>
                    {member.role === 'admin' && <span className="chip chip-accent" style={{ fontSize: 10 }}>Admin</span>}
                  </label>
                );
              })}
              {filteredMembers.length === 0 && (
                <p className="muted" style={{ fontSize: 13, padding: 12 }}>Nenhum aluno encontrado.</p>
              )}
            </div>
          </div>
        )}

        <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={close}>Cancelar</button>
          <button type="submit" disabled={saving} className="btn btn-accent">
            {saved ? <><Icon name="check" size={14} /> Salvo!</> : saving ? 'Salvando…' : <><Icon name="check" size={14} /> Salvar alterações</>}
          </button>
        </div>
      </form>
    </div>
  );
}

