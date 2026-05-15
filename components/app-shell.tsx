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
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  logoOnly: boolean;
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`app${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {mobileOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar
        user={{ name: user.name, level: user.level, xp: user.xp, role: user.role }}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        onMobileClose={() => setMobileOpen(false)}
        brand={brand ? { name: brand.name, logoUrl: brand.logoUrl, logoDarkUrl: brand.logoDarkUrl, faviconUrl: brand.faviconUrl, logoOnly: brand.logoOnly } : undefined}
      />
      <div className="main">
        <Topbar
          user={{ name: user.name, email: user.email, role: user.role }}
          onMobileMenu={() => setMobileOpen(true)}
        />
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
