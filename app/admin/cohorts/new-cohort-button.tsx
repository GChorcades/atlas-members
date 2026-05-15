'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons';
import { adminCreateCohort } from '@/lib/actions';

export default function NewCohortButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    const id = await adminCreateCohort({ name });
    setSaving(false);
    setOpen(false);
    setName('');
    router.push(`/admin/cohorts/${id}`);
  }

  return (
    <>
      <button className="btn btn-accent" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} /> Nova turma
      </button>

      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'grid', placeItems: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 440, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nova turma</h3>
            <div className="field-group">
              <label className="field-label">Nome da turma *</label>
              <input
                autoFocus
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Turma 2026.1 — Marketing Digital"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="row gap-8" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn btn-accent" onClick={handleCreate} disabled={saving || !name.trim()}>
                {saving ? 'Criando…' : 'Criar turma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
