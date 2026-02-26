import { useCallback, useEffect, useState } from "react";

type UseTransientErrorOptions = {
  displayMs?: number;
  onTimeout?: () => void;
};

export function useTransientError(options?: UseTransientErrorOptions) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayMs = options?.displayMs ?? 2_000;
  const onTimeout = options?.onTimeout;

  const showError = useCallback((message: string) => {
    setErrorMessage(message);
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setErrorMessage(null);
      onTimeout?.();
    }, displayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [displayMs, errorMessage, onTimeout]);

  return {
    errorMessage,
    showError,
    clearError,
  };
}
