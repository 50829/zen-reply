import { useCallback, type MouseEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * In Tauri v2 `data-tauri-drag-region` only fires on the element itself, NOT
 * on its children.  This hook provides an `onMouseDown` handler that manually
 * calls `startDragging()` whenever the user presses on a non-interactive area
 * inside a container.
 *
 * Attach the returned handler to any container element:
 *   <main onMouseDown={onDragMouseDown}>
 */

const INTERACTIVE_TAGS = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "BUTTON",
  "A",
]);

function isInteractive(el: HTMLElement): boolean {
  if (INTERACTIVE_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  // Walk up to see if nested inside an interactive element (e.g. <span> inside <button>)
  if (el.closest("input, textarea, select, button, a, [contenteditable='true']")) return true;
  return false;
}

export function useDragWindow() {
  const onDragMouseDown = useCallback((e: MouseEvent) => {
    // Only primary (left) button
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (isInteractive(target)) return;

    e.preventDefault();
    getCurrentWindow().startDragging();
  }, []);

  return onDragMouseDown;
}
