import { useCallback, useEffect, useRef, useState } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastState = {
  message: string;
  variant: ToastVariant;
};

type UseToastOptions = {
  /** Called when a toast auto-dismisses or is manually dismissed. */
  onDismiss?: (variant: ToastVariant) => void;
};

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  error: 2_000,
  success: 1_500,
  info: 1_500,
};

export function useToast(options?: UseToastOptions) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);
  const onDismissRef = useRef(options?.onDismiss);
  onDismissRef.current = options?.onDismiss;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    setToast((prev) => {
      if (prev) {
        onDismissRef.current?.(prev.variant);
      }
      return null;
    });
    clearTimer();
  }, [clearTimer]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant, durationMs?: number) => {
      clearTimer();
      const newToast: ToastState = { message, variant };
      setToast(newToast);

      const ms = durationMs ?? DEFAULT_DURATION[variant];
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setToast(null);
        onDismissRef.current?.(variant);
      }, ms);
    },
    [clearTimer],
  );

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  return { toast, showToast, dismissToast } as const;
}
