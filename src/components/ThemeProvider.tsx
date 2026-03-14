'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ThemeColors } from '@/types/config';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    async function loadTheme() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        const theme: ThemeColors | undefined = data.theme;

        if (theme) {
          applyTheme(theme);
        }
      } catch {
        // Use default CSS theme
      } finally {
        setLoaded(true);
      }
    }

    loadTheme();
  }, [pathname]);

  if (!loaded) {
    return null;
  }

  return <>{children}</>;
}

export function applyTheme(theme: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty('--color-obsidian-bg', theme.bg);
  root.style.setProperty('--color-obsidian-panel', theme.panel);
  root.style.setProperty('--color-obsidian-card', theme.card);
  root.style.setProperty('--color-obsidian-accent', theme.accent);
  root.style.setProperty('--color-obsidian-text', theme.text);
  root.style.setProperty('--color-obsidian-muted', theme.muted);
  root.style.setProperty('--color-obsidian-border', theme.border);
}
