'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type BunnyPlayerHandle = {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => Promise<number>;
};

type PlayerJsPlayer = {
  on: (event: string, cb: (data?: { seconds?: number }) => void) => void;
  setCurrentTime: (s: number) => void;
  getCurrentTime: (cb: (t: number) => void) => void;
  play: () => void;
};
type PlayerJsGlobal = { Player: new (el: HTMLIFrameElement) => PlayerJsPlayer };

declare global {
  interface Window {
    playerjs?: PlayerJsGlobal;
  }
}

let loadPromise: Promise<void> | null = null;
function loadPlayerjs(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.playerjs) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('playerjs load failed'));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export const BunnyPlayer = forwardRef<BunnyPlayerHandle, { src: string }>(
  function BunnyPlayer({ src }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const playerRef = useRef<PlayerJsPlayer | null>(null);
    const lastTime = useRef(0);

    useEffect(() => {
      let cancelled = false;
      loadPlayerjs()
        .then(() => {
          if (cancelled || !iframeRef.current || !window.playerjs) return;
          const p = new window.playerjs.Player(iframeRef.current);
          p.on('ready', () => {
            playerRef.current = p;
            p.on('timeupdate', (d) => {
              if (d?.seconds != null) lastTime.current = d.seconds;
            });
          });
        })
        .catch(() => {});
      return () => {
        cancelled = true;
        playerRef.current = null;
      };
    }, [src]);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        const p = playerRef.current;
        if (!p) return;
        try {
          p.setCurrentTime(seconds);
          p.play();
        } catch {
          /* ignore */
        }
      },
      getCurrentTime: () =>
        new Promise<number>((resolve) => {
          const p = playerRef.current;
          if (!p) {
            resolve(lastTime.current);
            return;
          }
          let done = false;
          const timer = setTimeout(() => {
            if (!done) { done = true; resolve(lastTime.current); }
          }, 600);
          try {
            p.getCurrentTime((t) => {
              if (done) return;
              done = true;
              clearTimeout(timer);
              resolve(typeof t === 'number' ? t : lastTime.current);
            });
          } catch {
            if (!done) { done = true; clearTimeout(timer); resolve(lastTime.current); }
          }
        }),
    }), []);

    return (
      <iframe
        ref={iframeRef}
        src={src}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  },
);
