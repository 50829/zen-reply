import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";

const LLM_STREAM_EVENT = "zenreply://llm-stream";

type StreamKind = "delta" | "done" | "error";

type LlmStreamEventPayload = {
  requestId: string;
  kind: StreamKind;
  delta?: string | null;
  message?: string | null;
};

type StartStreamOptions = {
  onDone?: () => void;
  onError?: (message: string) => void;
};

function createRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toErrorMessage(err: unknown): string {
  if (typeof err === "string") {
    return err;
  }

  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return "生成失败，请检查 API 配置";
}

export function useLlmStream() {
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState("");

  const activeRequestIdRef = useRef<string | null>(null);
  const onDoneRef = useRef<(() => void) | null>(null);
  const onErrorRef = useRef<((message: string) => void) | null>(null);

  const cancelRequest = useCallback((requestId: string) => {
    void invoke("cancel_generate_reply", { requestId }).catch(() => {
      // Best effort cancellation.
    });
  }, []);

  const stopStream = useCallback(() => {
    const currentRequestId = activeRequestIdRef.current;
    if (currentRequestId) {
      cancelRequest(currentRequestId);
    }
    activeRequestIdRef.current = null;
    setIsStreaming(false);
  }, [cancelRequest]);

  const resetStream = useCallback(() => {
    stopStream();
    setStreamedText("");
    setStreamError("");
  }, [stopStream]);

  const startStream = useCallback((prompt: string, options?: StartStreamOptions) => {
    const previousRequestId = activeRequestIdRef.current;
    if (previousRequestId) {
      cancelRequest(previousRequestId);
    }

    const requestId = createRequestId();
    activeRequestIdRef.current = requestId;
    onDoneRef.current = options?.onDone ?? null;
    onErrorRef.current = options?.onError ?? null;

    setStreamedText("");
    setStreamError("");
    setIsStreaming(true);

    void invoke("stream_generate_reply", { requestId, prompt }).catch((err) => {
      if (activeRequestIdRef.current !== requestId) {
        return;
      }

      const message = toErrorMessage(err);
      setStreamError(message);
      setIsStreaming(false);
      activeRequestIdRef.current = null;
      onErrorRef.current?.(message);
    });
  }, [cancelRequest]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let active = true;

    void listen<LlmStreamEventPayload>(LLM_STREAM_EVENT, (event) => {
      const payload = event.payload;
      if (!payload || payload.requestId !== activeRequestIdRef.current) {
        return;
      }

      if (payload.kind === "delta") {
        const delta = payload.delta ?? "";
        if (delta) {
          setStreamedText((current) => current + delta);
        }
        return;
      }

      if (payload.kind === "done") {
        setIsStreaming(false);
        activeRequestIdRef.current = null;
        onDoneRef.current?.();
        return;
      }

      if (payload.kind === "error") {
        const message = payload.message?.trim() || "生成失败，请重试";
        setStreamError(message);
        setIsStreaming(false);
        activeRequestIdRef.current = null;
        onErrorRef.current?.(message);
      }
    }).then((cleanup) => {
      if (!active) {
        cleanup();
        return;
      }
      unlisten = cleanup;
    });

    return () => {
      active = false;
      if (unlisten) {
        unlisten();
      }
      const currentRequestId = activeRequestIdRef.current;
      if (currentRequestId) {
        cancelRequest(currentRequestId);
      }
    };
  }, [cancelRequest]);

  return {
    streamedText,
    isStreaming,
    streamError,
    startStream,
    stopStream,
    resetStream,
  };
}
