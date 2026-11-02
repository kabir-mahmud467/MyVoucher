import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-2), { id, message, kind }]);
      const timer = window.setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 4000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message: string) => toast(message, 'success'),
      error: (message: string) => toast(message, 'error'),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end"
        aria-live="polite"
        aria-atomic="false"
      >
        {items.map((item) => {
          const Icon =
            item.kind === 'success'
              ? CheckCircle2
              : item.kind === 'error'
                ? AlertTriangle
                : Info;
          return (
            <div
              key={item.id}
              role={item.kind === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-line bg-surface p-3.5 pr-2.5 text-sm text-ink shadow-lift"
            >
              <Icon
                size={19}
                className={
                  item.kind === 'success'
                    ? 'mt-0.5 shrink-0 text-primary'
                    : item.kind === 'error'
                      ? 'mt-0.5 shrink-0 text-danger'
                      : 'mt-0.5 shrink-0 text-accent'
                }
              />
              <p className="flex-1 leading-relaxed">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="icon-btn -mt-1 h-7 w-7"
                aria-label="বার্তা বন্ধ করুন"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
