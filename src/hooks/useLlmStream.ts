import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_API_BASE, DEFAULT_MODEL_NAME } from "../shared/constants";
import { normalizeValue, toErrorMessage } from "../shared/utils";

const REQUEST_TIMEOUT_MS = 15_000;

type AbortReason = "manual" | "timeout" | null;

type StartStreamOptions = {
  onDone?: () => void;
  onError?: (message: string) => void;
  apiConfig?: LlmApiConfig;
};

export type LlmApiConfig = {
  apiKey: string;
  apiBase: string;
  modelName: string;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function buildChatEndpoint(apiBase: string): string {
  const normalizedBase = apiBase.trim().replace(/\/+$/, "");
  if (normalizedBase.endsWith("/chat/completions")) {
    return normalizedBase;
  }
  return `${normalizedBase}/chat/completions`;
}

function parseDeltaFromSse(data: string): string | null {
  try {
    const value = JSON.parse(data) as {
      choices?: Array<{
        delta?: { content?: string | null };
        text?: string | null;
      }>;
    };
    const firstChoice = value.choices?.[0];
    if (!firstChoice) {
      return null;
    }

    const deltaText = firstChoice.delta?.content ?? firstChoice.text ?? null;
    if (!deltaText) {
      return null;
    }

    return deltaText;
  } catch {
    return null;
  }
}

export function useLlmStream() {
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestTimeoutRef = useRef<number | null>(null);
  const abortReasonRef = useRef<AbortReason>(null);

  const clearRequestTimeout = useCallback(() => {
    if (requestTimeoutRef.current !== null) {
      window.clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    clearRequestTimeout();
    const currentController = abortControllerRef.current;
    if (currentController) {
      abortReasonRef.current = "manual";
      currentController.abort();
    }
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, [clearRequestTimeout]);

  const resetStream = useCallback(() => {
    stopStream();
    setStreamedText("");
    setStreamError("");
  }, [stopStream]);

  const startStream = useCallback((prompt: string, options?: StartStreamOptions) => {
    const apiKey = normalizeValue(options?.apiConfig?.apiKey, "");
    const apiBase = normalizeValue(options?.apiConfig?.apiBase, DEFAULT_API_BASE);
    const modelName = normalizeValue(options?.apiConfig?.modelName, DEFAULT_MODEL_NAME);

    if (!apiKey) {
      const message = "请先设置 API Key 以开启魔法。";
      setIsStreaming(false);
      setStreamedText("");
      setStreamError(message);
      options?.onError?.(message);
      return;
    }

    stopStream();
    setStreamedText("");
    setStreamError("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    abortReasonRef.current = null;

    requestTimeoutRef.current = window.setTimeout(() => {
      if (abortControllerRef.current !== controller) {
        return;
      }
      abortReasonRef.current = "timeout";
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const emitError = (message: string) => {
      setStreamError(message);
      options?.onError?.(message);
    };

    void (async () => {
      try {
        const response = await fetch(buildChatEndpoint(apiBase), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelName,
            stream: true,
            temperature: 0.7,
            messages: [
              {
                role: "system",
                content: "你是资深中文沟通优化专家，只输出可直接发送的一段中文回复正文。",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
          signal: controller.signal,
        });

        if (response.status === 401) {
          throw new Error("API Key 验证失败，请检查配置。");
        }

        if (response.status === 402) {
          throw new Error("账户余额不足，请去 SiliconFlow 充值。");
        }

        if (!response.ok) {
          const details = await response.text().catch(() => "");
          throw new Error(
            details
              ? `模型接口错误（${response.status}）：${details}`
              : `模型接口错误（${response.status}），请稍后重试。`,
          );
        }

        if (!response.body) {
          throw new Error("AI 响应为空，请稍后重试。");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = "";
        let isDone = false;

        while (!isDone) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          pending += decoder.decode(value, { stream: true });

          while (true) {
            const newlineIndex = pending.indexOf("\n");
            if (newlineIndex < 0) {
              break;
            }

            let line = pending.slice(0, newlineIndex);
            pending = pending.slice(newlineIndex + 1);
            if (line.endsWith("\r")) {
              line = line.slice(0, -1);
            }

            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) {
              continue;
            }

            const data = trimmed.slice(5).trim();
            if (!data) {
              continue;
            }

            if (data === "[DONE]") {
              isDone = true;
              break;
            }

            const delta = parseDeltaFromSse(data);
            if (delta) {
              setStreamedText((current) =>
                current ? current + delta : delta.replace(/^[\r\n]+/, ""),
              );
            }
          }
        }

        if (!isDone && pending.trim().startsWith("data:")) {
          const data = pending.trim().slice(5).trim();
          if (data && data !== "[DONE]") {
            const delta = parseDeltaFromSse(data);
            if (delta) {
              setStreamedText((current) =>
                current ? current + delta : delta.replace(/^[\r\n]+/, ""),
              );
            }
          }
        }

        options?.onDone?.();
      } catch (error) {
        if (isAbortError(error)) {
          if (abortReasonRef.current === "timeout") {
            emitError("请求超时（15 秒），请重试。");
          }
          return;
        }

        emitError(toErrorMessage(error));
      } finally {
        clearRequestTimeout();
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        abortReasonRef.current = null;
        setIsStreaming(false);
      }
    })();
  }, [clearRequestTimeout, stopStream]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {
    streamedText,
    isStreaming,
    streamError,
    startStream,
    stopStream,
    resetStream,
  };
}
