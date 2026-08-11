import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';

interface ItemFormDialogProps {
  title: string;
  titleId: string;
  submitError?: string | null;
  isSaving: boolean;
  isSubmitDisabled: boolean;
  shouldCloseOnEscape: boolean;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (event: FormEvent) => Promise<void>;
}

export default function ItemFormDialog({
  title,
  titleId,
  submitError,
  isSaving,
  isSubmitDisabled,
  shouldCloseOnEscape,
  children,
  onClose,
  onSubmit,
}: ItemFormDialogProps) {
  const dialogRef = useDialogFocus({ onClose, shouldCloseOnEscape });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:px-6 md:py-8">
      <motion.div className="absolute inset-0 bg-black/25 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-h-[88vh] md:max-w-3xl md:rounded-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-slate-200 md:hidden" />
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-4 pt-3">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label={`关闭${title}表单`} disabled={isSaving} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brandStrong">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={(event) => void onSubmit(event)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">{children}</div>
          <div className="border-t border-slate-100 bg-white px-5 py-4">
            {submitError ? <div role="alert" className="mb-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div> : null}
            <button type="submit" disabled={isSubmitDisabled} className="w-full rounded-2xl bg-brandStrong py-4 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
