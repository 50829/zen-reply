import { useCallback } from "react";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useZenReplyContext } from "./contexts/ZenReplyContext";
import { useSettingsContext } from "./contexts/SettingsContext";
import { CUSTOM_ROLE_HOTKEY } from "./shared/constants";

/**
 * Thin wrapper that connects global keyboard shortcuts to the
 * ZenReply and Settings contexts. Renders nothing.
 */
export function AppShortcuts() {
  const {
    stage,
    mode,
    setMode,
    hasBlockingError,
    startGenerating,
    startCustomRoleEditing,
    selectRoleByHotkey,
    selectStyleByHotkey,
    confirmAndCopy,
    terminateSession,
  } = useZenReplyContext();

  const {
    isSettingsOpen,
    isSettingsBusy,
    openSettings,
    closeSettings,
    saveSettings,
  } = useSettingsContext();

  const handleOpenSettings = useCallback(() => { void openSettings(); }, [openSettings]);
  const handleStartGenerating = useCallback(() => { void startGenerating(); }, [startGenerating]);
  const handleTerminateSession = useCallback(() => { void terminateSession(); }, [terminateSession]);
  const handleConfirmAndCopy = useCallback(() => { void confirmAndCopy(); }, [confirmAndCopy]);
  const handleSaveSettings = useCallback(() => { void saveSettings(); }, [saveSettings]);
  const handleSwitchMode = useCallback((m: import("./features/zenreply/types").Mode) => { setMode(m); }, [setMode]);

  useGlobalShortcuts({
    isSettingsOpen,
    stage,
    mode,
    hasBlockingError,
    customRoleHotkey: CUSTOM_ROLE_HOTKEY,
    isSettingsBusy,
    onOpenSettings: handleOpenSettings,
    onCloseSettings: closeSettings,
    onTerminateSession: handleTerminateSession,
    onSelectRoleHotkey: selectRoleByHotkey,
    onSelectStyleHotkey: selectStyleByHotkey,
    onSwitchMode: handleSwitchMode,
    onStartCustomRoleEditing: startCustomRoleEditing,
    onStartGenerating: handleStartGenerating,
    onConfirmAndCopy: handleConfirmAndCopy,
    onSaveSettings: handleSaveSettings,
  });

  return null;
}
