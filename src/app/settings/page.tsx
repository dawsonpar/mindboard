'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Toast } from '@/components/Toast';

const inputClass =
  'w-full bg-obsidian-bg border border-obsidian-border rounded-input text-obsidian-text p-2 text-sm focus:outline-none focus:border-obsidian-accent';

export default function SettingsPage() {
  const [rootDir, setRootDir] = useState('');
  const [saving, setSaving] = useState(false);
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
      } catch {
        setToast({ message: 'Failed to load configuration', type: 'error' });
      }
    }

    loadConfig();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootDir: rootDir.trim() }),
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

        <div className="bg-obsidian-panel border border-obsidian-border rounded-card p-6">
          <label
            htmlFor="root-dir"
            className="block text-xs text-obsidian-muted mb-1"
          >
            Absolute path to your notes directory
          </label>
          <input
            id="root-dir"
            type="text"
            value={rootDir}
            onChange={(e) => setRootDir(e.target.value)}
            placeholder="/Users/you/notes"
            className={inputClass}
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 bg-obsidian-accent text-obsidian-text px-4 py-2 rounded-input text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
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
