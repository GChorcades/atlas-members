'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icons';

const ITEMS = [
  { href: '/admin/courses', label: 'Cursos', icon: 'courses' },
  { href: '/admin/cohorts', label: 'Turmas', icon: 'users' },
  { href: '/admin/students', label: 'Alunos', icon: 'profile' },
  { href: '/admin/comments', label: 'Comentários', icon: 'chat' },
  { href: '/admin/checkouts', label: 'Checkouts', icon: 'cart' },
  { href: '/admin/fiscal', label: 'Nota Fiscal', icon: 'file' },
  { href: '/admin/settings', label: 'Configurações', icon: 'settings' },
];

const STORAGE_KEY = 'atlas-admin-nav-collapsed';

export default function AdminNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === 'true');
    } catch {
      // localStorage unavailable
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }

  return (
    <nav className={`admin-nav${collapsed ? ' collapsed' : ''}`}>
      <button
        className="admin-nav-collapse-arrow"
        onClick={toggle}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        <Icon
          name="chevron-right"
          size={13}
          style={{
            transform: collapsed ? 'none' : 'rotate(180deg)',
            transition: 'transform 200ms',
          }}
        />
      </button>
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="admin-nav-item"
          data-active={pathname.startsWith(item.href)}
          title={collapsed ? item.label : undefined}
        >
          <Icon name={item.icon} size={16} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
