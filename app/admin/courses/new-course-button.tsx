'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons';
import { adminCreateCourse } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export default function NewCourseButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await adminCreateCourse({
      title: fd.get('title') as string,
      subtitle: fd.get('subtitle') as string,
      description: fd.get('description') as string,
      instructor: fd.get('instructor') as string,
      instructorRole: fd.get('instructorRole') as string,
      level: fd.get('level') as string,
      coverBg: fd.get('coverBg') as string,
      coverGlyph: fd.get('coverGlyph') as string,
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn btn-accent" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} /> Novo curso
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 className="h2">Novo curso</h2>
              <button className="icon-btn" onClick={() => setOpen(false)}><Icon name="x" size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="field-group">
                <label className="field-label">Título *</label>
                <input name="title" required className="input-field" placeholder="Ex: Marketing Digital Estratégico" />
              </div>
              <div className="field-group">
                <label className="field-label">Subtítulo</label>
                <input name="subtitle" className="input-field" placeholder="Frase curta de apoio" />
              </div>
              <div className="field-group">
                <label className="field-label">Descrição</label>
                <textarea name="description" className="input-field" rows={3} placeholder="Descrição do curso" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field-group">
                  <label className="field-label">Instrutor *</label>
                  <input name="instructor" required className="input-field" placeholder="Nome do instrutor" />
                </div>
                <div className="field-group">
                  <label className="field-label">Cargo</label>
                  <input name="instructorRole" className="input-field" placeholder="Ex: CMO · 10 anos" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="field-group">
                  <label className="field-label">Nível</label>
                  <select name="level" className="input-field">
                    <option>Iniciante</option>
                    <option>Intermediário</option>
                    <option>Avançado</option>
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Símbolo (glyph)</label>
                  <input name="coverGlyph" className="input-field" placeholder="MD" maxLength={4} />
                </div>
                <div className="field-group">
                  <label className="field-label">Cor de fundo</label>
                  <input name="coverBg" className="input-field" placeholder="linear-gradient(…)" />
                </div>
              </div>
              <div className="row gap-8" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <button type="submit" disabled={loading} className="btn btn-accent" style={{ marginLeft: 'auto' }}>
                  {loading ? 'Criando…' : 'Criar curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
