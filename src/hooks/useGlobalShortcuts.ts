import { useEffect } from "react";
import type { Stage } from "../features/zenreply/types";

type UseGlobalShortcutsOptions = {
  isSettingsOpen: boolean;
  stage: Stage;
  hasBlockingError: boolean;
  customRoleHotkey: number;
  onOpenSettings: () => void | Promise<void>;
  onCloseSettings: () => void;
  onTerminateSession: () => void | Promise<void>;
  onSelectRoleHotkey: (hotkey: 1 | 2 | 3) => void;
  onStartCustomRoleEditing: () => void;
  onStartGenerating: () => void | Promise<void>;
  onConfirmAndCopy: () => void | Promise<void>;
};

export function useGlobalShortcuts(options: UseGlobalShortcutsOptions) {
  const {
    isSettingsOpen,
    stage,
    hasBlockingError,
    customRoleHotkey,
    onOpenSettings,
    onCloseSettings,
    onTerminateSession,
    onSelectRoleHotkey,
    onStartCustomRoleEditing,
    onStartGenerating,
    onConfirmAndCopy,
  } = options;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        if (isSettingsOpen) {
          onCloseSettings();
        } else {
          void onOpenSettings();
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (isSettingsOpen) {
          onCloseSettings();
          return;
        }
        void onTerminateSession();
        return;
      }

      if (isSettingsOpen) {
        return;
      }

      if (!isTyping && stage === "INPUT") {
        if (event.key >= "1" && event.key <= "3") {
          onSelectRoleHotkey(Number(event.key) as 1 | 2 | 3);
          return;
        }

        if (event.key === String(customRoleHotkey)) {
          event.preventDefault();
          onStartCustomRoleEditing();
          return;
        }
      }

      if (event.key === "Enter" && !event.shiftKey && !isTyping) {
        if (stage === "INPUT") {
          event.preventDefault();
          if (!hasBlockingError) {
            void onStartGenerating();
          }
          return;
        }

        if (stage === "FINISHED") {
          event.preventDefault();
          void onConfirmAndCopy();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    customRoleHotkey,
    hasBlockingError,
    isSettingsOpen,
    onCloseSettings,
    onConfirmAndCopy,
    onOpenSettings,
    onSelectRoleHotkey,
    onStartCustomRoleEditing,
    onStartGenerating,
    onTerminateSession,
    stage,
  ]);
}
