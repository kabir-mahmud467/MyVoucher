import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../providers/ThemeProvider';

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === 'dark' ? 'হালকা থিম' : 'গাঢ় থিম';
  return (
    <button
      type="button"
      onClick={() => void toggleTheme()}
      className="icon-btn"
      aria-label={nextLabel}
      title={nextLabel}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      {withLabel && <span className="sr-only">{nextLabel}</span>}
    </button>
  );
}
