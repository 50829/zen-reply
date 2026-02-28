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
    hasBlockingError,
    startGenerating,
    startCustomRoleEditing,
    selectRoleByHotkey,
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

  useGlobalShortcuts({
    isSettingsOpen,
    stage,
    hasBlockingError,
    customRoleHotkey: CUSTOM_ROLE_HOTKEY,
    isSettingsBusy,
    onOpenSettings: handleOpenSettings,
    onCloseSettings: closeSettings,
    onTerminateSession: handleTerminateSession,
    onSelectRoleHotkey: selectRoleByHotkey,
    onStartCustomRoleEditing: startCustomRoleEditing,
    onStartGenerating: handleStartGenerating,
    onConfirmAndCopy: handleConfirmAndCopy,
    onSaveSettings: handleSaveSettings,
  });

  return null;
}
