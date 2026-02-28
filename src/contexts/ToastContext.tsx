import { createContext, useContext, type ReactNode } from "react";
import { useToast, type ToastVariant, type ToastState } from "../hooks/useToast";

type ToastContextValue = {
  toast: ToastState | null;
  showToast: (message: string, variant: ToastVariant, durationMs?: number) => void;
  dismissToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastContext must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({
  onDismiss,
  children,
}: {
  onDismiss?: (variant: ToastVariant) => void;
  children: ReactNode;
}) {
  const { toast, showToast, dismissToast } = useToast({ onDismiss });
  return (
    <ToastContext.Provider value={{ toast, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}
