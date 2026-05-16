import React from 'react';

type IconProps = {
  name: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
};

export function Icon({ name, size = 20, style, className }: IconProps) {
  const props = {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    style, className,
  };
  const P = (d: string, extra?: object) => <path d={d} {...extra} />;
  switch (name) {
    case 'home': return <svg {...props}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg>;
    case 'courses': return <svg {...props}><path d="M4 5h16v3H4z"/><path d="M5 8v11h14V8"/><path d="M9 12h6"/></svg>;
    case 'book': return <svg {...props}><path d="M12 6c-1.6-1.1-4.1-2-8-2v13c3.9 0 6.4.9 8 2"/><path d="M12 6c1.6-1.1 4.1-2 8-2v13c-3.9 0-6.4.9-8 2"/><path d="M12 6v13"/></svg>;
    case 'trail': return <svg {...props}><path d="M6 4v12a3 3 0 0 0 3 3h6a3 3 0 0 1 0 6"/><path d="M6 4 4 6"/><path d="M6 4l2 2"/><circle cx="15" cy="22" r="0.5" fill="currentColor"/></svg>;
    case 'progress': return <svg {...props}><path d="M3 20V8"/><path d="M9 20V12"/><path d="M15 20V4"/><path d="M21 20V14"/></svg>;
    case 'profile': return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case 'bell': return <svg {...props}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2.5h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>;
    case 'search': return <svg {...props}><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>;
    case 'play': return <svg {...props} fill="currentColor" stroke="none"><path d="M7 5v14l12-7z"/></svg>;
    case 'play-circle': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor" stroke="none"/></svg>;
    case 'pause': return <svg {...props} fill="currentColor" stroke="none"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>;
    case 'check': return <svg {...props}><path d="m5 12 4.5 4.5L19 7"/></svg>;
    case 'check-circle': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>;
    case 'clock': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'flame': return <svg {...props}><path d="M12 3c0 4 5 5 5 11a5 5 0 0 1-10 0c0-3 2-4 2-7 0 2 3 3 3-4z"/></svg>;
    case 'trophy': return <svg {...props}><path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/><path d="M10 13v3h4v-3"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>;
    case 'spark': return <svg {...props}><path d="M12 3v6"/><path d="M12 15v6"/><path d="M3 12h6"/><path d="M15 12h6"/><path d="M5.6 5.6 9 9"/><path d="M15 15l3.4 3.4"/><path d="M18.4 5.6 15 9"/><path d="M9 15l-3.4 3.4"/></svg>;
    case 'brain': return <svg {...props}><path d="M9 5a3 3 0 0 0-3 3 3 3 0 0 0-1 5 3 3 0 0 0 1 4 3 3 0 0 0 3 3V5z"/><path d="M15 5a3 3 0 0 1 3 3 3 3 0 0 1 1 5 3 3 0 0 1-1 4 3 3 0 0 1-3 3V5z"/></svg>;
    case 'note': return <svg {...props}><path d="M5 4h11l3 3v13H5z"/><path d="M16 4v3h3"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>;
    case 'streak': return <svg {...props}><path d="M8 21c-2 0-4-2-4-5 0-3 3-4 3-7 0 2 2 2 2-2 1 1 3 3 3 6 0-2 1-3 1-5 2 2 3 5 3 8 0 3-2 5-4 5z"/></svg>;
    case 'chat': return <svg {...props}><path d="M4 5h16v11H8l-4 4z"/></svg>;
    case 'certificate': return <svg {...props}><rect x="3" y="4" width="18" height="13" rx="1"/><path d="M8 21l4-3 4 3v-7H8z"/><circle cx="12" cy="10" r="2"/></svg>;
    case 'download': return <svg {...props}><path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>;
    case 'file': return <svg {...props}><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/></svg>;
    case 'pdf': return <svg {...props}><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><text x="9" y="17" fontSize="5" fill="currentColor" stroke="none" fontFamily="ui-monospace, monospace" fontWeight="700">PDF</text></svg>;
    case 'arrow-right': return <svg {...props}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>;
    case 'arrow-left': return <svg {...props}><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>;
    case 'chevron-right': return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case 'chevron-down': return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case 'chevron-up': return <svg {...props}><path d="m6 15 6-6 6 6"/></svg>;
    case 'menu': return <svg {...props}><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>;
    case 'grid': return <svg {...props}><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>;
    case 'list': return <svg {...props}><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>;
    case 'plus': return <svg {...props}><path d="M12 5v14"/><path d="M5 12h14"/></svg>;
    case 'x': return <svg {...props}><path d="m6 6 12 12"/><path d="M18 6 6 18"/></svg>;
    case 'heart': return <svg {...props}><path d="M12 20s-7-4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 6-7 10-7 10z"/></svg>;
    case 'bookmark': return <svg {...props}><path d="M6 4h12v17l-6-4-6 4z"/></svg>;
    case 'star': return <svg {...props}><path d="m12 4 2.5 5 5.5.8-4 4 1 5.5L12 16.8 7 19.3l1-5.5-4-4 5.5-.8z"/></svg>;
    case 'volume': return <svg {...props}><path d="M5 10v4h3l4 4V6L8 10z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>;
    case 'settings': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4.8a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.4a7 7 0 0 0-2 1.2l-2.4-.8-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-.8a7 7 0 0 0 2 1.2L10 21h4l.5-2.4a7 7 0 0 0 2-1.2l2.4.8 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z"/></svg>;
    case 'fullscreen': return <svg {...props}><path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>;
    case 'logout': return <svg {...props}><path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4"/><path d="M20 12H10"/></svg>;
    case 'edit': return <svg {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>;
    case 'trash': return <svg {...props}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
    case 'eye': return <svg {...props}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'grip': return <svg {...props}><circle cx="9" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none"/></svg>;
    case 'users': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'cart': return <svg {...props}><path d="M3 4h2l2 12h12l2-9H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>;
    default: return null;
  }
}
