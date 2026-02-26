import { useEffect, useRef, type RefObject } from "react";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";

type UseAutoResizeWindowOptions = {
  panelRef: RefObject<HTMLElement | null>;
  triggerKey: number;
  width: number;
  minHeight: number;
  maxHeight: number;
  verticalPadding: number;
};

export function useAutoResizeWindow(options: UseAutoResizeWindowOptions) {
  const resizeRafRef = useRef<number | null>(null);
  const lastAppliedHeightRef = useRef(0);

  const { panelRef, triggerKey, width, minHeight, maxHeight, verticalPadding } = options;

  useEffect(() => {
    const appWindow = getCurrentWindow();
    let active = true;
    let observer: ResizeObserver | null = null;

    const clearResizeRaf = () => {
      if (resizeRafRef.current !== null) {
        window.cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    };

    const applyWindowSize = async () => {
      if (!active) {
        return;
      }

      const panelHeight = panelRef.current?.getBoundingClientRect().height ?? 0;
      if (!panelHeight) {
        return;
      }

      const nextHeight = Math.round(
        Math.min(maxHeight, Math.max(minHeight, panelHeight + verticalPadding)),
      );

      if (nextHeight === lastAppliedHeightRef.current) {
        return;
      }

      lastAppliedHeightRef.current = nextHeight;

      try {
        await appWindow.setResizable(true);
        await appWindow.setMinSize(new LogicalSize(width, minHeight));
        await appWindow.setMaxSize(new LogicalSize(width, maxHeight));
        await appWindow.setSize(new LogicalSize(width, nextHeight));
      } catch {
        // Best effort sync; window size update failure should not block UI.
      }
    };

    const scheduleResize = () => {
      clearResizeRaf();
      resizeRafRef.current = window.requestAnimationFrame(() => {
        void applyWindowSize();
      });
    };

    scheduleResize();

    if (panelRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        scheduleResize();
      });
      observer.observe(panelRef.current);
    }

    return () => {
      active = false;
      clearResizeRaf();
      observer?.disconnect();
    };
  }, [maxHeight, minHeight, panelRef, triggerKey, verticalPadding, width]);
}
