import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface UseDialogFocusInput {
  onClose: () => void;
  shouldCloseOnEscape?: boolean;
}

export function useDialogFocus({
  onClose,
  shouldCloseOnEscape = true,
}: UseDialogFocusInput): RefObject<HTMLDivElement | null> {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const shouldCloseOnEscapeRef = useRef(shouldCloseOnEscape);
  onCloseRef.current = onClose;
  shouldCloseOnEscapeRef.current = shouldCloseOnEscape;

  useEffect(() => {
    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousBodyOverflow = document.body.style.overflow;
    const dialogElement = dialogRef.current;

    if (!dialogElement) {
      return undefined;
    }

    const focusableElements = Array.from(
      dialogElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    const initialFocusTarget = focusableElements[0] ?? dialogElement;
    initialFocusTarget.focus();
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && shouldCloseOnEscapeRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const currentFocusableElements = Array.from(
        dialogElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (currentFocusableElements.length === 0) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const firstElement = currentFocusableElements[0];
      const lastElement = currentFocusableElements[currentFocusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previousActiveElement?.focus();
    };
  }, []);

  return dialogRef;
}
