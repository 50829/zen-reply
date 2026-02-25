import { useCallback, useEffect, useRef, useState } from "react";

type StreamConfig = {
  minDelayMs?: number;
  maxDelayMs?: number;
};

type StartStreamOptions = {
  onDone?: () => void;
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function useMockStream(config: StreamConfig = {}) {
  const { minDelayMs = 30, maxDelayMs = 50 } = config;
  const timerRef = useRef<number | null>(null);
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const stopStream = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const resetStream = useCallback(() => {
    stopStream();
    setStreamedText("");
  }, [stopStream]);

  const startStream = useCallback(
    (fullText: string, options?: StartStreamOptions) => {
      resetStream();
      setIsStreaming(true);

      const source = fullText || "";
      let index = 0;

      const tick = () => {
        index += 1;
        setStreamedText(source.slice(0, index));

        if (index >= source.length) {
          stopStream();
          options?.onDone?.();
          return;
        }

        timerRef.current = window.setTimeout(
          tick,
          randomInt(minDelayMs, maxDelayMs),
        );
      };

      timerRef.current = window.setTimeout(
        tick,
        randomInt(minDelayMs, maxDelayMs),
      );
    },
    [maxDelayMs, minDelayMs, resetStream, stopStream],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    streamedText,
    isStreaming,
    startStream,
    stopStream,
    resetStream,
  };
}

