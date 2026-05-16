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

const ADMIN_ITEMS = [
  { href: '/admin/courses', label: 'Cursos', icon: 'courses' },
  { href: '/admin/cohorts', label: 'Turmas', icon: 'users' },
  { href: '/admin/students', label: 'Alunos', icon: 'profile' },
  { href: '/admin/comments', label: 'Comentários', icon: 'chat' },
  { href: '/admin/checkouts', label: 'Checkouts', icon: 'cart' },
  { href: '/admin/fiscal', label: 'Nota Fiscal', icon: 'file' },
  { href: '/admin/settings', label: 'Configurações', icon: 'settings' },
];

type Props = {
  user: { name: string; level: number; xp: number; role: string };
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
  brand?: { name: string; logoUrl: string | null; logoDarkUrl: string | null; faviconUrl: string | null; logoOnly: boolean };
};

export function Sidebar({ user, collapsed, onToggle, onMobileClose, brand }: Props) {
  const pathname = usePathname();
  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const brandName = brand?.name ?? 'Atlas';
  const brandMark = (brandName[0] ?? 'A').toUpperCase();
  // Recolhido: usa o favicon (ícone quadrado); expandido: usa o logo.
  const markSrc = collapsed ? (brand?.faviconUrl || brand?.logoUrl) : brand?.logoUrl;
  // Variante para modo escuro (só no estado expandido, onde o logo é usado).
  const markSrcDark = collapsed ? markSrc : (brand?.logoDarkUrl || brand?.logoUrl);
  const hasDarkLogo = !!markSrc && !!markSrcDark && markSrcDark !== markSrc;
  // Nome ao lado do logo só quando não há logo OU a opção "apenas logo" está desligada.
  const logoOnly = !!(brand?.logoUrl && brand?.logoOnly);
  const showName = !collapsed && !logoOnly;
  // Logo em largura total quando "apenas logo" está ativo e a sidebar está expandida.
  const fullWidthLogo = !collapsed && logoOnly && !!brand?.logoUrl;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        {markSrc ? (
          hasDarkLogo ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`light-${markSrc}-${collapsed ? 'c' : 'e'}-${fullWidthLogo ? 'full' : 'mark'}`}
                src={markSrc}
                alt={brandName}
                className={`${fullWidthLogo ? 'sidebar-brand-logo-full' : 'sidebar-brand-mark'} brand-logo-light`}
                style={{ objectFit: 'contain', background: 'transparent', padding: 2 }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`dark-${markSrcDark}-${collapsed ? 'c' : 'e'}-${fullWidthLogo ? 'full' : 'mark'}`}
                src={markSrcDark ?? markSrc}
                alt={brandName}
                className={`${fullWidthLogo ? 'sidebar-brand-logo-full' : 'sidebar-brand-mark'} brand-logo-dark`}
                style={{ objectFit: 'contain', background: 'transparent', padding: 2 }}
              />
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${markSrc}-${collapsed ? 'c' : 'e'}-${fullWidthLogo ? 'full' : 'mark'}`}
              src={markSrc}
              alt={brandName}
              className={fullWidthLogo ? 'sidebar-brand-logo-full' : 'sidebar-brand-mark'}
              style={{ objectFit: 'contain', background: 'transparent', padding: 2 }}
            />
          )
        ) : (
          <span className="sidebar-brand-mark">{brandMark}</span>
        )}
        {showName && <span className="sidebar-brand-text">{brandName}</span>}
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
          onClick={onMobileClose}
        >
          <Icon name={item.icon} size={18} />
          <span>{item.label}</span>
        </Link>
      ))}

      {user.role === 'admin' && (
        <div className="sidebar-admin-block">
          <div className="sidebar-section">Admin</div>
          {ADMIN_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-item"
              data-active={pathname === item.href || pathname.startsWith(item.href)}
              title={collapsed ? item.label : undefined}
              onClick={onMobileClose}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
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
