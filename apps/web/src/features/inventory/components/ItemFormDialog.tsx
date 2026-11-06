import { useId, type FormEvent, type ReactNode } from 'react';
import ResponsiveDialog from '../../../shared/ui/ResponsiveDialog';

interface ItemFormDialogProps {
  title: string;
  submitError?: string | null;
  isSaving: boolean;
  isSubmitDisabled: boolean;
  allowContinue?: boolean;
  shouldCloseOnEscape: boolean;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (event: FormEvent) => Promise<void>;
}

export default function ItemFormDialog({
  title,
  submitError,
  isSaving,
  isSubmitDisabled,
  allowContinue = false,
  shouldCloseOnEscape,
  children,
  onClose,
  onSubmit,
}: ItemFormDialogProps) {
  const formId = useId();

  return (
    <ResponsiveDialog
      title={title}
      size="lg"
      closeLabel={`关闭${title}表单`}
      isCloseDisabled={isSaving}
      shouldCloseOnEscape={shouldCloseOnEscape}
      onClose={onClose}
      footer={(
        <>
          {submitError ? <div role="alert" className="mb-3 max-h-28 overflow-y-auto break-words rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div> : null}
          <div className="flex gap-3">
            {allowContinue ? <button type="submit" form={formId} value="continue" disabled={isSubmitDisabled} className="flex-1 rounded-2xl bg-brandTint px-3 py-4 text-sm font-semibold text-brandStrong disabled:opacity-50">保存并继续</button> : null}
            <button type="submit" form={formId} disabled={isSubmitDisabled} className="flex-1 rounded-2xl bg-brandStrong py-4 text-sm font-semibold text-white shadow-sm shadow-brand/20 transition hover:bg-brandHover disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </>
      )}
    >
      <form id={formId} onSubmit={(event) => void onSubmit(event)}>
        <fieldset disabled={isSaving} className="min-w-0 space-y-5 px-5 py-4 md:px-6">{children}</fieldset>
      </form>
    </ResponsiveDialog>
  );
}
