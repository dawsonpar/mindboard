'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Toast } from '@/components/Toast';
import { applyTheme } from '@/components/ThemeProvider';
import { DEFAULT_THEME, type ThemeColors } from '@/types/config';
import { KeybindingEditor } from '@/components/settings/KeybindingEditor';

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

type Section = 'general' | 'appearance' | 'shortcuts';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
];

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('general');
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
    <div className="min-h-screen bg-obsidian-bg flex justify-center px-4 pt-16 sm:pt-24">
      <div className="w-full max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-lg font-bold text-obsidian-text">Settings</h1>
          <Link href="/" className="text-sm text-obsidian-accent hover:underline">
            Back to board
          </Link>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Section nav */}
          <nav
            className="flex shrink-0 gap-1 sm:w-48 sm:flex-col"
            aria-label="Settings sections"
          >
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={section === s.id ? 'page' : undefined}
                className={`rounded-input px-3 py-2 text-left text-sm transition-colors ${
                  section === s.id
                    ? 'bg-[color-mix(in_srgb,var(--color-obsidian-accent),transparent_85%)] text-obsidian-text shadow-[inset_2px_0_0_0_var(--color-obsidian-accent)]'
                    : 'text-obsidian-muted hover:text-obsidian-text'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {section === 'general' && (
              <div className="rounded-card border border-obsidian-border bg-obsidian-panel p-6">
                <label
                  htmlFor="root-dir"
                  className="mb-1 block text-xs text-obsidian-muted"
                >
                  Absolute path to your notes directory
                </label>
                <div className="flex gap-2">
                  <input
                    id="root-dir"
                    type="text"
                    value={rootDir}
                    onChange={(e) => setRootDir(e.target.value)}
                    placeholder="/path/to/your/notes"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleBrowse}
                    disabled={browsing}
                    className="shrink-0 rounded-input border border-obsidian-border bg-obsidian-card px-3 py-2 text-sm text-obsidian-text transition-colors hover:border-obsidian-accent disabled:opacity-50"
                  >
                    {browsing ? 'Opening...' : 'Browse'}
                  </button>
                </div>
              </div>
            )}

            {section === 'appearance' && (
              <div className="rounded-card border border-obsidian-border bg-obsidian-panel p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-obsidian-text">Theme</h2>
                  <button
                    type="button"
                    onClick={handleResetTheme}
                    className="text-xs text-obsidian-muted transition-colors hover:text-obsidian-text"
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
                        className="h-8 w-8 cursor-pointer rounded-input border border-obsidian-border bg-transparent p-0"
                        aria-label={`${label} color`}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs text-obsidian-muted">{label}</span>
                        <span className="font-mono text-xs text-obsidian-text">{theme[key]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {section === 'shortcuts' && (
              <div className="rounded-card border border-obsidian-border bg-obsidian-panel p-6">
                <KeybindingEditor
                  onToast={(message, type) => setToast({ message, type })}
                />
              </div>
            )}

            {section !== 'shortcuts' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-6 w-full rounded-input bg-obsidian-accent px-4 py-2 text-sm text-obsidian-text transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
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
