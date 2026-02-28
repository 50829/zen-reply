import { useCallback, useRef } from "react";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";

type UseAutoResizeWindowOptions = {
  width: number;
  minHeight: number;
  maxHeight: number;
  verticalPadding: number;
};

/** Debounce interval — prevents high-frequency IPC from ResizeObserver. */
const RESIZE_DEBOUNCE_MS = 16;

/**
 * Manages the Tauri window size so it tracks the panel content height.
 *
 * Exposes `reportContentHeight(h)` — called by FlipCard whenever the real
 * content height changes. The hook debounces rapid-fire calls and only
 * calls show()/setFocus() once (on first report), not on every resize.
 */
export function useAutoResizeWindow(options: UseAutoResizeWindowOptions) {
  const lastAppliedHeightRef = useRef(0);
  const hasShownRef = useRef(false);
  const debounceTimerRef = useRef<number>(0);

  // Keep latest options in a ref so the callback identity never changes.
  const optsRef = useRef(options);
  optsRef.current = options;

  /**
   * Called by FlipCard whenever the measured face height changes.
   * This is the **single source of truth** for the window height.
   */
  const reportContentHeight = useCallback((height: number) => {
    const { width, minHeight, maxHeight, verticalPadding } = optsRef.current;

    const nextHeight = Math.round(
      Math.min(maxHeight, Math.max(minHeight, height + verticalPadding)),
    );

    const sizeChanged = nextHeight !== lastAppliedHeightRef.current;
    if (!sizeChanged && hasShownRef.current) return;

    lastAppliedHeightRef.current = nextHeight;

    // Debounce rapid-fire ResizeObserver calls.
    window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const w = getCurrentWindow();
          await w.setSize(new LogicalSize(width, nextHeight));

          // Only show + focus on the first report (initial wake).
          // Subsequent resizes just update dimensions silently.
          if (!hasShownRef.current) {
            hasShownRef.current = true;
            await w.show();
            await w.setFocus();
          }
        } catch (err) {
          console.warn("[useAutoResizeWindow] resize failed:", err);
        }
      })();
    }, hasShownRef.current ? RESIZE_DEBOUNCE_MS : 0);
  }, []);

  /** Reset visibility tracking — call when the window is hidden. */
  const resetVisibility = useCallback(() => {
    hasShownRef.current = false;
    lastAppliedHeightRef.current = 0;
  }, []);

  return { reportContentHeight, resetVisibility };
}
