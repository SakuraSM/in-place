import ResponsiveDialog from './ResponsiveDialog';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  isConfirming?: boolean;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = '确认',
  onConfirm,
  onCancel,
  danger = false,
  isConfirming = false,
}: ConfirmDialogProps) {
  return (
    <ResponsiveDialog
      title={title}
      description={message}
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
      shouldCloseOnBackdrop={!isConfirming}
      shouldCloseOnEscape={!isConfirming}
      footer={(
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="rounded-2xl bg-surfaceMuted py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-borderSoft disabled:cursor-not-allowed disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`rounded-2xl py-3 text-sm font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brandStrong hover:bg-teal-700'
            }`}
          >
            {isConfirming ? '处理中…' : confirmLabel}
          </button>
        </div>
      )}
    >
      <div className="sr-only">{message}</div>
    </ResponsiveDialog>
  );
}
