'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Toast } from '@/components/Toast';
import { applyTheme } from '@/components/ThemeProvider';
import { DEFAULT_THEME, type ThemeColors } from '@/types/config';

const inputClass =
  'w-full bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text p-2 text-sm focus:outline-none focus:border-obsidian-accent';

const colorLabels: { key: keyof ThemeColors; label: string }[] = [
  { key: 'bg', label: 'Background' },
  { key: 'panel', label: 'Panel' },
  { key: 'card', label: 'Card' },
  { key: 'accent', label: 'Accent' },
  { key: 'text', label: 'Text' },
  { key: 'muted', label: 'Muted text' },
  { key: 'border', label: 'Border' },
];

export default function SettingsPage() {
  const [rootDir, setRootDir] = useState('');
  const [theme, setTheme] = useState<ThemeColors>(DEFAULT_THEME);
  const [saving, setSaving] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'info' | 'error' | 'success';
  } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        setRootDir(data.rootDir ?? '');
        if (data.theme) {
          setTheme({ ...DEFAULT_THEME, ...data.theme });
        }
      } catch {
        setToast({ message: 'Failed to load configuration', type: 'error' });
      }
    }

    loadConfig();
  }, []);

  async function handleBrowse() {
    setBrowsing(true);
    try {
      const res = await fetch('/api/browse');
      if (!res.ok) {
        const data = await res.json();
        if (data.error !== 'Directory selection was cancelled or failed') {
          setToast({ message: data.error ?? 'Browse failed', type: 'error' });
        }
        return;
      }
      const data = await res.json();
      if (data.path) {
        setRootDir(data.path);
      }
    } catch {
      setToast({ message: 'Failed to open folder picker', type: 'error' });
    } finally {
      setBrowsing(false);
    }
  }

  function handleThemeChange(key: keyof ThemeColors, value: string) {
    const updated = { ...theme, [key]: value };
    setTheme(updated);
    applyTheme(updated);
  }

  function handleResetTheme() {
    setTheme(DEFAULT_THEME);
    applyTheme(DEFAULT_THEME);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootDir: rootDir.trim(), theme }),
      });

      if (!res.ok) {
        setToast({ message: 'Failed to save settings', type: 'error' });
        return;
      }

      setToast({ message: 'Settings saved', type: 'success' });
    } catch {
      setToast({ message: 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-obsidian-bg flex items-start justify-center pt-24">
      <div className="w-full max-w-lg px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-lg font-bold text-obsidian-text">Settings</h1>
          <Link
            href="/"
            className="text-sm text-obsidian-accent hover:underline"
          >
            Back to board
          </Link>
        </div>

        <div className="bg-obsidian-panel border border-obsidian-border rounded-card p-6 mb-6">
          <label
            htmlFor="root-dir"
            className="block text-xs text-obsidian-muted mb-1"
          >
            Absolute path to your notes directory
          </label>
          <div className="flex gap-2">
            <input
              id="root-dir"
              type="text"
              value={rootDir}
              onChange={(e) => setRootDir(e.target.value)}
              placeholder="/Users/you/notes"
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={handleBrowse}
              disabled={browsing}
              className="bg-obsidian-card border border-obsidian-border text-obsidian-text px-3 py-2 rounded-input text-sm hover:border-obsidian-accent transition-colors disabled:opacity-50 shrink-0"
            >
              {browsing ? 'Opening...' : 'Browse'}
            </button>
          </div>
        </div>

        <div className="bg-obsidian-panel border border-obsidian-border rounded-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-obsidian-text">Theme</h2>
            <button
              type="button"
              onClick={handleResetTheme}
              className="text-xs text-obsidian-muted hover:text-obsidian-text transition-colors"
            >
              Reset to default
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {colorLabels.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <input
                  type="color"
                  value={theme[key]}
                  onChange={(e) => handleThemeChange(key, e.target.value)}
                  className="w-8 h-8 rounded-input border border-obsidian-border cursor-pointer bg-transparent p-0"
                  aria-label={`${label} color`}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-obsidian-muted block">{label}</span>
                  <span className="text-xs text-obsidian-text font-mono">{theme[key]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-obsidian-accent text-obsidian-text px-4 py-2 rounded-input text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
