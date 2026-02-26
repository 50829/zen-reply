/**
 * Normalize a string value: trim whitespace and fall back to a default if empty.
 */
export function normalizeValue(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? "").trim();
  return trimmed || fallback;
}

/**
 * Extract a human-readable error message from an unknown thrown value.
 */
export function toErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof TypeError) {
    return "无法连接到 AI 服务器，请检查网络。";
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return "操作失败，请重试";
}
