import { useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";

type UseAutoResizeWindowOptions = {
  width: number;
  maxHeight: number;
  verticalPadding: number;
};

/** Debounce interval — prevents high-frequency IPC from ResizeObserver. */
const RESIZE_DEBOUNCE_MS = 16;

/**
 * Manages the Tauri window size so it tracks the panel content height.
 *
 * First report uses the Rust `show_window` command (single IPC: setSize +
 * center + show + setFocus). Subsequent resizes only call `setSize`.
 */
export function useAutoResizeWindow(options: UseAutoResizeWindowOptions) {
  const lastAppliedHeightRef = useRef(0);
  const hasShownRef = useRef(false);
  const debounceTimerRef = useRef<number>(0);

  const optsRef = useRef(options);
  optsRef.current = options;

  const reportContentHeight = useCallback((height: number) => {
    const { width, maxHeight, verticalPadding } = optsRef.current;

    const nextHeight = Math.round(
      Math.min(maxHeight, height + verticalPadding),
    );

    const sizeChanged = nextHeight !== lastAppliedHeightRef.current;
    if (!sizeChanged && hasShownRef.current) return;

    lastAppliedHeightRef.current = nextHeight;

    window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          if (!hasShownRef.current) {
            // First report: single IPC — resize + center + show + focus.
            hasShownRef.current = true;
            await invoke("show_window", { width, height: nextHeight });
          } else {
            // Subsequent resizes: only update dimensions.
            await getCurrentWindow().setSize(
              new LogicalSize(width, nextHeight),
            );
          }
        } catch (err) {
          console.warn("[useAutoResizeWindow] resize failed:", err);
        }
      })();
    }, hasShownRef.current ? RESIZE_DEBOUNCE_MS : 0);
  }, []);

  const resetVisibility = useCallback(() => {
    hasShownRef.current = false;
    lastAppliedHeightRef.current = 0;
  }, []);

  return { reportContentHeight, resetVisibility };
}
