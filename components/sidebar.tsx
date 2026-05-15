'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './icons';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: 'home' },
  { href: '/catalog', label: 'Meus cursos', icon: 'courses' },
  { href: '/trails', label: 'Trilhas', icon: 'trail' },
  { href: '/progress', label: 'Progresso', icon: 'progress' },
  { href: '/profile', label: 'Perfil', icon: 'profile' },
];

type Props = {
  user: { name: string; level: number; xp: number; role: string };
  collapsed: boolean;
  onToggle: () => void;
  brand?: { name: string; logoUrl: string | null };
};

export function Sidebar({ user, collapsed, onToggle, brand }: Props) {
  const pathname = usePathname();
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const brandName = brand?.name ?? 'Atlas';
  const brandMark = (brandName[0] ?? 'A').toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        {brand?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt={brandName}
            className="sidebar-brand-mark"
            style={{ objectFit: 'contain', background: 'transparent', padding: 2 }}
          />
        ) : (
          <span className="sidebar-brand-mark">{brandMark}</span>
        )}
        <span className="sidebar-brand-text">{brandName}</span>
        <button
          className="sidebar-collapse-arrow"
          onClick={onToggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <Icon
            name="chevron-right"
            size={13}
            style={{ transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 200ms' }}
          />
        </button>
      </div>

      {!collapsed && <div className="sidebar-section">Navegar</div>}

      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="nav-item"
          data-active={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
          title={collapsed ? item.label : undefined}
        >
          <Icon name={item.icon} size={18} />
          <span>{item.label}</span>
        </Link>
      ))}

      {user.role === 'admin' && (
        <Link
          href="/admin"
          className="nav-item"
          data-active={pathname.startsWith('/admin')}
          title={collapsed ? 'Admin' : undefined}
          style={{ marginTop: 2 }}
        >
          <Icon name="settings" size={18} />
          <span>Admin</span>
        </Link>
      )}

      <div className="sidebar-user">
        <div className="avatar">{initials}</div>
        {!collapsed && (
          <div className="sidebar-user-meta">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-handle">Nível {user.level} · {user.xp.toLocaleString('pt-BR')} XP</span>
          </div>
        )}
      </div>
    </aside>
  );
}
