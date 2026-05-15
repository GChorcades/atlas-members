'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Icon } from './icons';
import { ThemeToggle } from './theme-toggle';

type Props = {
  user: { name: string; email: string; role: string };
};

export function Topbar({ user }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-search">
        <Icon name="search" size={16} />
        <input placeholder="Buscar cursos, aulas, materiais…" />
        <kbd>⌘K</kbd>
      </div>
      <div className="topbar-actions">
        <ThemeToggle />
        {user.role === 'admin' && (
          <Link
            href="/admin"
            className="chip chip-accent"
            style={{ marginRight: 6, cursor: 'pointer' }}
          >
            <Icon name="settings" size={11} /> Admin
          </Link>
        )}

        <div ref={menuRef} style={{ position: 'relative', marginLeft: 8 }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'transparent', border: 0, padding: 2, borderRadius: 999,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{initials}</div>
            <Icon name="chevron-down" size={13} style={{ color: 'var(--text-muted)' }} />
          </button>

          {menuOpen && (
            <div className="dropdown" style={{ top: 'calc(100% + 6px)', right: 0 }}>
              <div style={{ padding: '10px 10px 12px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                <div className="row gap-10">
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{user.email}</div>
                  </div>
                </div>
              </div>
              <Link href="/profile" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                <Icon name="profile" size={15} /> Meu perfil
              </Link>
              <Link href="/progress" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                <Icon name="progress" size={15} /> Meu progresso
              </Link>
              {user.role === 'admin' && (
                <>
                  <div className="dropdown-divider" />
                  <Link href="/admin" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    <Icon name="settings" size={15} /> Painel admin
                  </Link>
                </>
              )}
              <div className="dropdown-divider" />
              <button
                className="dropdown-item danger"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <Icon name="logout" size={15} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
