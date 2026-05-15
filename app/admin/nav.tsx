'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/icons';

const ITEMS = [
  { href: '/admin/courses', label: 'Cursos', icon: 'courses' },
  { href: '/admin/cohorts', label: 'Turmas', icon: 'users' },
  { href: '/admin/students', label: 'Alunos', icon: 'profile' },
  { href: '/admin/checkouts', label: 'Checkouts', icon: 'cart' },
  { href: '/admin/comments', label: 'Comentários', icon: 'chat' },
  { href: '/admin/settings', label: 'Configurações', icon: 'settings' },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="admin-nav">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="admin-nav-item"
          data-active={pathname.startsWith(item.href)}
        >
          <Icon name={item.icon} size={16} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
