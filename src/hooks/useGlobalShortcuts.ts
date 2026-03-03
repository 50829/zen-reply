import { useEffect } from "react";
import type { Mode, Stage } from "../features/zenreply/types";

type UseGlobalShortcutsOptions = {
  isSettingsOpen: boolean;
  stage: Stage;
  mode: Mode;
  hasBlockingError: boolean;
  customRoleHotkey: number;
  isSettingsBusy: boolean;
  onOpenSettings: () => void | Promise<void>;
  onCloseSettings: () => void;
  onTerminateSession: () => void | Promise<void>;
  onSelectRoleHotkey: (hotkey: 1 | 2 | 3) => void;
  onSelectStyleHotkey: (hotkey: 1 | 2 | 3 | 4) => void;
  onStartCustomRoleEditing: () => void;
  onStartGenerating: () => void | Promise<void>;
  onConfirmAndCopy: () => void | Promise<void>;
  onSaveSettings: () => void | Promise<void>;
};

export function useGlobalShortcuts(options: UseGlobalShortcutsOptions) {
  const {
    isSettingsOpen,
    stage,
    mode,
    hasBlockingError,
    customRoleHotkey,
    isSettingsBusy,
    onOpenSettings,
    onCloseSettings,
    onTerminateSession,
    onSelectRoleHotkey,
    onSelectStyleHotkey,
    onStartCustomRoleEditing,
    onStartGenerating,
    onConfirmAndCopy,
    onSaveSettings,
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

      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        if (isSettingsOpen && !isSettingsBusy) {
          void onSaveSettings();
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
        if (mode === "translate") {
          if (event.key >= "1" && event.key <= "4") {
            onSelectStyleHotkey(Number(event.key) as 1 | 2 | 3 | 4);
            return;
          }
        } else {
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
    isSettingsBusy,
    isSettingsOpen,
    mode,
    onCloseSettings,
    onConfirmAndCopy,
    onOpenSettings,
    onSaveSettings,
    onSelectRoleHotkey,
    onSelectStyleHotkey,
    onStartCustomRoleEditing,
    onStartGenerating,
    onTerminateSession,
    stage,
  ]);
}
