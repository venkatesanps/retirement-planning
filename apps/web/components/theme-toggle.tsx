'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Moon, Sun, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'theme-mode';

function readMode(): Mode {
  if (typeof window === 'undefined') return 'system';
  const m = localStorage.getItem(STORAGE_KEY);
  return m === 'light' || m === 'dark' || m === 'system' ? m : 'system';
}

function subscribeToMode(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('storage', cb);
  // also notify when this tab changes via dispatchEvent below
  window.addEventListener('themechange', cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener('themechange', cb);
  };
}

function applyMode(mode: Mode) {
  const root = document.documentElement;
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', isDark);
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(
    subscribeToMode,
    readMode,
    () => 'system' as Mode,
  );
  const [mounted, setMounted] = useState(false);
  // Mount-detection pattern: required because the SSR snapshot can't read localStorage,
  // so the first render must produce stable HTML and only swap to the real mode client-side.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Keep system-mode in sync with OS pref changes while mounted
  useEffect(() => {
    if (mode !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyMode('system');
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode]);

  // Whenever mode changes, apply it
  useEffect(() => {
    if (mounted) applyMode(mode);
  }, [mounted, mode]);

  function change(next: Mode) {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event('themechange'));
  }

  if (!mounted) return <div className="w-[88px] h-7" aria-hidden />;

  return (
    <div className="inline-flex h-7 items-center rounded-full border border-border bg-card/60 p-0.5 text-muted-foreground">
      {(
        [
          { id: 'light' as Mode, icon: Sun, label: 'Light theme' },
          { id: 'system' as Mode, icon: Laptop, label: 'System theme' },
          { id: 'dark' as Mode, icon: Moon, label: 'Dark theme' },
        ]
      ).map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => change(id)}
          className={cn(
            'inline-flex h-6 w-6 items-center justify-center rounded-full transition',
            mode === id ? 'bg-background text-foreground shadow-sm' : 'hover:text-foreground',
          )}
          aria-label={label}
          aria-pressed={mode === id}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
