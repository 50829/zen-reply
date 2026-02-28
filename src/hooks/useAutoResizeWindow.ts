import { useCallback, useRef } from "react";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";

type UseAutoResizeWindowOptions = {
  width: number;
  minHeight: number;
  maxHeight: number;
  verticalPadding: number;
};

/**
 * Manages the Tauri window size so it tracks the panel content height.
 *
 * Exposes `reportContentHeight(h)` — called by FlipCard whenever the real
 * content height changes.  After resizing, the hook shows the window
 * (and focuses it) so the user never sees a stale/empty transparent frame.
 */
export function useAutoResizeWindow(options: UseAutoResizeWindowOptions) {
  const lastAppliedHeightRef = useRef(0);

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
    lastAppliedHeightRef.current = nextHeight;

    void (async () => {
      try {
        const w = getCurrentWindow();
        if (sizeChanged) {
          await w.setSize(new LogicalSize(width, nextHeight));
        }
        // Always ensure the window is visible & focused after sizing.
        // show() and setFocus() are no-ops if already shown/focused.
        await w.show();
        await w.setFocus();
      } catch {
        // Permission errors or IPC failures — best-effort.
      }
    })();
  }, []);

  return { reportContentHeight };
}
