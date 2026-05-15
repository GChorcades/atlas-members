'use client';

import { useEffect, useRef, useState } from 'react';

type Person = { name: string; city: string; uf: string };

const TIME_AGO = ['há poucos segundos', 'há 1 minuto', 'há 2 minutos', 'há 4 minutos', 'agora mesmo'];

export default function SocialProofToaster({ courseTitle }: { courseTitle: string }) {
  const [current, setCurrent] = useState<{ person: Person; ago: string } | null>(null);
  const [visible, setVisible] = useState(false);
  const peopleRef = useRef<Person[]>([]);
  const idxRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/social-proof')
      .then((r) => r.json())
      .then((data: { people: Person[] }) => {
        if (cancelled || !data.people?.length) return;
        // Embaralha para não repetir a mesma ordem
        peopleRef.current = [...data.people].sort(() => Math.random() - 0.5);
        scheduleNext(6000); // primeiro toast após ~6s
      })
      .catch(() => {});

    function scheduleNext(delay: number) {
      const t = setTimeout(showToast, delay);
      timers.current.push(t);
    }

    function showToast() {
      const people = peopleRef.current;
      if (!people.length) return;
      const person = people[idxRef.current % people.length];
      idxRef.current += 1;
      const ago = TIME_AGO[Math.floor(Math.random() * TIME_AGO.length)];
      setCurrent({ person, ago });
      setVisible(true);

      // esconde após 6s
      const hide = setTimeout(() => setVisible(false), 6000);
      timers.current.push(hide);

      // próximo entre 12s e 60s
      const nextDelay = 12000 + Math.random() * 48000;
      scheduleNext(nextDelay + 6000);
    }

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  if (!current) return null;

  const initials = current.person.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <div
      style={{
        position: 'fixed',
        left: 20,
        bottom: 20,
        zIndex: 200,
        maxWidth: 340,
        background: 'var(--bg-elevated, #fff)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transform: visible ? 'translateY(0)' : 'translateY(140%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 360ms cubic-bezier(0.16,1,0.3,1), opacity 360ms',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'var(--accent-fg)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {initials}
      </div>
      <div style={{ minWidth: 0, fontSize: 13, lineHeight: 1.45 }}>
        <div>
          <strong>{current.person.name}</strong>
          <span style={{ color: 'var(--text-muted)' }}> de {current.person.city}-{current.person.uf}</span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          acabou de adquirir <strong style={{ color: 'var(--text)' }}>{courseTitle}</strong>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{current.ago}</div>
      </div>
    </div>
  );
}
