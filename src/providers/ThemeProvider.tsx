import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { setSetting } from '../db/settingsService';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.classList.toggle('light', theme === 'light');
  root.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a231d' : '#0f5a48');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const storedTheme = useLiveQuery(() => db.settings.get('theme'), [], undefined);
  const [theme, setThemeState] = useState<Theme>(() => {
    // UI preference cache only. The durable source of truth is IndexedDB.
    try {
      return localStorage.getItem('myvoucher-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    if (storedTheme?.value === 'dark' || storedTheme?.value === 'light') {
      setThemeState(storedTheme.value);
    }
  }, [storedTheme?.value]);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('myvoucher-theme', theme);
    } catch {
      // Storage may be blocked; the app still works using IndexedDB.
    }
  }, [theme]);

  const setTheme = useCallback(async (nextTheme: Theme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);
    await setSetting('theme', nextTheme);
  }, []);

  const toggleTheme = useCallback(async () => {
    await setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
