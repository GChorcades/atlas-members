'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

type UserData = {
  name: string;
  email: string;
  role: string;
  level: number;
  xp: number;
};

type BrandData = {
  name: string;
  logoUrl: string | null;
  footer: string | null;
};

export function AppShell({
  user,
  brand,
  children,
}: {
  user: UserData;
  brand?: BrandData;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`app${collapsed ? ' sidebar-collapsed' : ''}`}>
      <Sidebar
        user={{ name: user.name, level: user.level, xp: user.xp, role: user.role }}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        brand={brand ? { name: brand.name, logoUrl: brand.logoUrl } : undefined}
      />
      <div className="main">
        <Topbar user={{ name: user.name, email: user.email, role: user.role }} />
        {children}
        {brand?.footer && (
          <footer
            style={{
              padding: '32px 32px 40px',
              marginTop: 'auto',
              borderTop: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: 12,
              textAlign: 'center',
              whiteSpace: 'pre-line',
            }}
          >
            {brand.footer}
          </footer>
        )}
      </div>
    </div>
  );
}
