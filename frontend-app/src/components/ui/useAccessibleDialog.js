import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "details > summary",
  "audio[controls]",
  "video[controls]",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Gestiona el teclado y el ciclo de foco de un diálogo modal.
 * El diálogo debe pasar su ref y permanecer marcado como aria-modal.
 * Solo el diálogo modal superior procesa Escape y Tab, permitiendo anidamiento.
 */
export default function useAccessibleDialog({ open, onClose, dialogRef }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || !dialogRef?.current) return undefined;

    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const focusable = () =>
      Array.from(dialog.querySelectorAll(FOCUSABLE)).filter((element) => {
        const style = window.getComputedStyle(element);
        return (
          element.getClientRects().length > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          !element.hasAttribute("disabled") &&
          !element.closest('[aria-hidden="true"]') &&
          !element.closest("[inert]")
        );
      });

    const first = focusable()[0];
    (first || dialog).focus({ preventScroll: true });

    const isTopDialog = () => {
      const dialogs = Array.from(
        document.querySelectorAll('[role="dialog"][aria-modal="true"]')
      );
      return dialogs[dialogs.length - 1] === dialog;
    };

    const handleFocusIn = (event) => {
      if (!isTopDialog() || dialog.contains(event.target)) return;
      const elements = focusable();
      (elements[0] || dialog).focus({ preventScroll: true });
    };

    const handleKeyDown = (event) => {
      if (!isTopDialog()) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

      const elements = focusable();
      if (!elements.length) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const firstElement = elements[0];
      const lastElement = elements[elements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === firstElement || !dialog.contains(active))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (active === lastElement || !dialog.contains(active))) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      if (previousFocus?.isConnected && typeof previousFocus.focus === "function") {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open, dialogRef]);
}
