'use client';

import { useEffect, useState } from 'react';

/**
 * Indicador animado para tarefas longas (transcrição, geração IA).
 * Barra indeterminada + mensagens que vão trocando + cronômetro,
 * para o usuário sentir que algo está acontecendo.
 */
export function WorkingIndicator({ steps }: { steps: string[] }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, steps.length - 1));
    }, 6000);
    const clock = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      clearInterval(stepTimer);
      clearInterval(clock);
    };
  }, [steps.length]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--bg-muted)',
        padding: '14px 16px',
        marginBottom: 12,
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div className="row gap-8" style={{ alignItems: 'center' }}>
          <span className="working-spinner" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{steps[stepIdx]}</span>
        </div>
        <span className="mono muted" style={{ fontSize: 12 }}>{mm}:{ss}</span>
      </div>
      <div className="working-track">
        <div className="working-bar" />
      </div>
    </div>
  );
}
