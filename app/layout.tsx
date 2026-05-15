import type { Metadata } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { THEME_BOOTSTRAP_SCRIPT } from '@/components/theme-toggle';
import { getBrand } from '@/lib/brand';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument',
  style: ['normal', 'italic'],
});

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    title: `${brand.name} — Área de Membros`,
    description: 'Plataforma de cursos online',
    icons: brand.faviconUrl
      ? { icon: [{ url: brand.faviconUrl }], shortcut: brand.faviconUrl, apple: brand.faviconUrl }
      : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBrand();
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        <style suppressHydrationWarning>{`
          :root {
            --font-sans: ${geist.style.fontFamily}, ui-sans-serif, system-ui, -apple-system, sans-serif;
            --font-display: ${instrumentSerif.style.fontFamily}, 'Instrument Serif', serif;
            --font-mono: ${geistMono.style.fontFamily}, ui-monospace, monospace;
          }
          ${brand.color ? `
            :root, [data-theme="light"], [data-theme="dark"] {
              --accent: ${brand.color};
              --accent-fg: #ffffff;
              --accent-soft: color-mix(in srgb, ${brand.color} 12%, transparent);
              --accent-soft-fg: ${brand.color};
            }
          ` : ''}
        `}</style>
      </head>
      <body className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
