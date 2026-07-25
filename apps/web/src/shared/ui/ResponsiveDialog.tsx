import { type ReactNode, useId } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useDialogFocus } from './useDialogFocus';

type ResponsiveDialogSize = 'sm' | 'md' | 'lg';

interface ResponsiveDialogProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  size?: ResponsiveDialogSize;
  shouldCloseOnBackdrop?: boolean;
  shouldCloseOnEscape?: boolean;
  showCloseButton?: boolean;
}

const DIALOG_WIDTH_CLASS: Record<ResponsiveDialogSize, string> = {
  sm: 'md:max-w-sm',
  md: 'md:max-w-xl',
  lg: 'md:max-w-3xl',
};

export default function ResponsiveDialog({
  title,
  description,
  children,
  footer,
  onClose,
  closeLabel = '关闭',
  size = 'md',
  shouldCloseOnBackdrop = true,
  shouldCloseOnEscape = true,
  showCloseButton = true,
}: ResponsiveDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useDialogFocus({ onClose, shouldCloseOnEscape });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:px-6 md:py-8">
      <div
        aria-hidden="true"
        onClick={shouldCloseOnBackdrop ? onClose : undefined}
        className="absolute inset-0 cursor-default bg-slate-950/30 backdrop-blur-sm"
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-picker md:max-h-[88vh] md:rounded-3xl ${DIALOG_WIDTH_CLASS[size]}`}
      >
        <div className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-border md:hidden" />
        <header className="flex items-start justify-between gap-4 border-b border-borderSoft px-5 pb-4 pt-3 md:px-6 md:pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-6 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>
          {showCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-surfaceMuted text-slate-600 transition-colors hover:bg-brandTint hover:text-brandStrong"
            >
              <X size={18} />
            </button>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <footer className="border-t border-borderSoft bg-surface px-5 py-4 md:px-6">
            {footer}
          </footer>
        ) : null}
      </motion.div>
    </div>
  );
}
