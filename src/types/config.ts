export interface ThemeColors {
  bg: string;
  panel: string;
  card: string;
  accent: string;
  text: string;
  muted: string;
  border: string;
}

export const DEFAULT_THEME: ThemeColors = {
  bg: '#1e1e1e',
  panel: '#252525',
  card: '#2d2d2d',
  accent: '#7c6f9f',
  text: '#dcddde',
  muted: '#999999',
  border: '#3a3a3a',
};

export interface MindBoardConfig {
  rootDir: string;
  lastSelectedProject: string | null;
  theme?: ThemeColors;
}
