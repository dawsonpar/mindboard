// Central registry of global keyboard shortcuts plus combo helpers.
// A "combo" is serialized as optional Mod/Shift/Alt prefixes + a
// KeyboardEvent.code, e.g. "Mod+Shift+Period". "Mod" = Cmd on macOS,
// Ctrl elsewhere (matched via metaKey || ctrlKey).

export interface ShortcutDef {
  id: string;
  label: string;
  default: string;
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: 'command-palette', label: 'Open command palette', default: 'Mod+Shift+KeyP' },
  { id: 'search', label: 'Open search', default: 'Mod+KeyK' },
  { id: 'toggle-sidebar', label: 'Toggle project sidebar', default: 'Mod+Shift+Comma' },
  { id: 'toggle-actions', label: 'Toggle actions and filters', default: 'Mod+Shift+Period' },
];

export interface Combo {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  code: string;
}

const MODIFIER_CODES = new Set([
  'MetaLeft', 'MetaRight', 'ControlLeft', 'ControlRight',
  'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight',
]);

export function parseCombo(s: string | null | undefined): Combo | null {
  if (!s) return null;
  const parts = s.split('+');
  const code = parts[parts.length - 1];
  if (!code) return null;
  return {
    mod: parts.includes('Mod'),
    shift: parts.includes('Shift'),
    alt: parts.includes('Alt'),
    code,
  };
}

export function comboToString(c: Combo): string {
  const parts: string[] = [];
  if (c.mod) parts.push('Mod');
  if (c.shift) parts.push('Shift');
  if (c.alt) parts.push('Alt');
  parts.push(c.code);
  return parts.join('+');
}

// Build a combo from a keydown event; null for a bare modifier press.
export function eventToCombo(e: KeyboardEvent): Combo | null {
  if (MODIFIER_CODES.has(e.code)) return null;
  return {
    mod: e.metaKey || e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    code: e.code,
  };
}

export function matchEvent(e: KeyboardEvent, combo: string | Combo | null | undefined): boolean {
  const c = typeof combo === 'string' || combo == null ? parseCombo(combo as string) : combo;
  if (!c) return false;
  return (
    (e.metaKey || e.ctrlKey) === c.mod &&
    e.shiftKey === c.shift &&
    e.altKey === c.alt &&
    e.code === c.code
  );
}

function codeLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'",
    BracketLeft: '[', BracketRight: ']', Backslash: '\\', Backquote: '`',
    Minus: '-', Equal: '=', Space: 'Space', Enter: 'Enter', Escape: 'Esc',
    Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  };
  return map[code] ?? code;
}

export function formatCombo(combo: string | Combo | null | undefined, isMac: boolean): string {
  const c = typeof combo === 'string' || combo == null ? parseCombo(combo as string) : combo;
  if (!c) return '';
  if (isMac) {
    return `${c.mod ? '⌘' : ''}${c.alt ? '⌥' : ''}${c.shift ? '⇧' : ''}${codeLabel(c.code)}`;
  }
  const parts: string[] = [];
  if (c.mod) parts.push('Ctrl');
  if (c.alt) parts.push('Alt');
  if (c.shift) parts.push('Shift');
  parts.push(codeLabel(c.code));
  return parts.join('+');
}

// Effective bindings: per-action override falling back to the default.
export function resolveBindings(overrides?: Record<string, string> | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const def of SHORTCUTS) {
    out[def.id] = overrides?.[def.id] ?? def.default;
  }
  return out;
}
