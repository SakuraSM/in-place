import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X, type LucideIcon } from 'lucide-react';
import {
  ToastContext,
  type ToastContextValue,
  type ToastMessage,
  type ToastTone,
} from './toast';

const TOAST_DURATION_MS = 4_500;

interface ToastRecord extends ToastMessage {
  id: string;
}

interface ToastProviderProps {
  children: ReactNode;
}

interface ToastItemProps {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}

const TOAST_PRESENTATION: Record<ToastTone, {
  icon: LucideIcon;
  iconClassName: string;
  surfaceClassName: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconClassName: 'text-emerald-600',
    surfaceClassName: 'border-emerald-200 bg-emerald-50/95',
  },
  error: {
    icon: AlertCircle,
    iconClassName: 'text-rose-600',
    surfaceClassName: 'border-rose-200 bg-rose-50/95',
  },
  info: {
    icon: Info,
    iconClassName: 'text-brandStrong',
    surfaceClassName: 'border-brand/30 bg-brandTint/95',
  },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const presentation = TOAST_PRESENTATION[toast.tone];
  const Icon = presentation.icon;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => onDismiss(toast.id), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [onDismiss, toast.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-2xl border p-4 shadow-card backdrop-blur ${presentation.surfaceClassName}`}
    >
      <Icon size={20} className={`mt-0.5 shrink-0 ${presentation.iconClassName}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{toast.title}</p>
        {toast.description ? (
          <p className="mt-1 text-sm leading-5 text-slate-600">{toast.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="关闭通知"
        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-900"
      >
        <X size={15} />
      </button>
    </motion.div>
  );
}

export default function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: ToastMessage) => {
    setToasts((currentToasts) => [
      ...currentToasts,
      { ...message, id: window.crypto.randomUUID() },
    ]);
  }, []);

  const contextValue = useMemo<ToastContextValue>(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-4 top-4 z-[80] mx-auto flex max-w-md flex-col gap-2 md:left-auto md:right-6 md:top-6 md:mx-0 md:w-full"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
