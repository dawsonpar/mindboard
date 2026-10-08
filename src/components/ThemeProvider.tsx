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
  root.style.colorScheme = isDarkColor(theme.bg) ? 'dark' : 'light';
}

/** Lets native controls (date and time picker icons, scrollbars) match the palette. */
function isDarkColor(hex: string): boolean {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (!m) return false;
  const [r, g, b] = m.slice(1).map((c) => parseInt(c, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}
