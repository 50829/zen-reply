import { useCallback, useRef, type ReactNode } from "react";
import { ToastProvider } from "./ToastContext";
import { SettingsProvider } from "./SettingsContext";
import { ZenReplyProvider } from "./ZenReplyContext";
import type { ToastVariant } from "../hooks/useToast";

/**
 * Composes all Context providers in the correct dependency order:
 *   Toast → Settings → ZenReply
 *
 * Also wires the "error toast dismissed → clearBlockingError" bridge
 * via the `onDismiss` callback.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const clearBlockingErrorRef = useRef<() => void>(() => {});

  const onToastDismiss = useCallback((variant: ToastVariant) => {
    if (variant === "error") {
      clearBlockingErrorRef.current();
    }
  }, []);

  return (
    <ToastProvider onDismiss={onToastDismiss}>
      <SettingsProvider>
        <ZenReplyProvider>
          <ClearErrorBridge clearRef={clearBlockingErrorRef} />
          {children}
        </ZenReplyProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}

// Internal: connects the ZenReply clearError action to the toast dismiss bridge.
import { useZenReplyContext } from "./ZenReplyContext";

function ClearErrorBridge({
  clearRef,
}: {
  clearRef: React.MutableRefObject<() => void>;
}) {
  const { clearError } = useZenReplyContext();
  clearRef.current = clearError;
  return null;
}
