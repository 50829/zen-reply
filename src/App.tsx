import { useCallback, useMemo, useRef } from "react";
import { ZenToast } from "./components/feedback/ZenToast";
import { FlipCard } from "./components/layout/FlipCard";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { WorkArea } from "./components/zenreply/WorkArea";
import { CUSTOM_ROLE_HOTKEY } from "./features/zenreply/types";
import { useAutoResizeWindow } from "./hooks/useAutoResizeWindow";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useSettings } from "./hooks/useSettings";
import { useToast } from "./hooks/useToast";
import { useZenReplyFlow } from "./hooks/useZenReplyFlow";

const WINDOW_FIXED_WIDTH = 600;
const WINDOW_MIN_HEIGHT = 280;
const WINDOW_MAX_HEIGHT = 980;
const WINDOW_VERTICAL_PADDING = 32;

function App() {
  const panelRef = useRef<HTMLElement | null>(null);
  const clearBlockingErrorRef = useRef<() => void>(() => {});

  const { toast, showToast } = useToast({
    onDismiss: (variant) => {
      if (variant === "error") {
        clearBlockingErrorRef.current();
      }
    },
  });

  const {
    isSettingsOpen,
    settingsDraft,
    isSettingsBusy,
    setIsSettingsOpen,
    syncSettingsFromStore,
    openSettings,
    closeSettings,
    onFieldChange,
    saveSettings,
    testApiConnection,
  } = useSettings({ showToast });

  const {
    stage,
    rawText,
    contextText,
    targetRole,
    customRoleName,
    customRoleDraft,
    isCustomRoleEditing,
    panelAnimateKey,
    isAwake,
    hasBlockingError,
    clearError,
    streamedText,
    isStreaming,
    roleMeta,
    setRawText,
    setCustomRoleDraft,
    setContextText,
    startGenerating,
    startCustomRoleEditing,
    cancelCustomRoleEditing,
    confirmCustomRole,
    confirmAndCopy,
    selectPresetRole,
    selectRoleByHotkey,
    terminateSession,
  } = useZenReplyFlow(
    useMemo(
      () => ({
        syncSettingsFromStore,
        setIsSettingsOpen,
        showToast,
      }),
      [syncSettingsFromStore, setIsSettingsOpen, showToast],
    ),
  );

  clearBlockingErrorRef.current = clearError;

  // ── Async-to-void wrappers for callbacks passed to shortcuts / children ──

  const handleOpenSettings = useCallback(() => {
    void openSettings();
  }, [openSettings]);

  const handleStartGenerating = useCallback(() => {
    void startGenerating();
  }, [startGenerating]);

  const handleTerminateSession = useCallback(() => {
    void terminateSession();
  }, [terminateSession]);

  const handleConfirmAndCopy = useCallback(() => {
    void confirmAndCopy();
  }, [confirmAndCopy]);

  const handleSaveSettings = useCallback(() => {
    void saveSettings();
  }, [saveSettings]);

  const handleTestApi = useCallback(() => {
    void testApiConnection();
  }, [testApiConnection]);

  // ── Infrastructure hooks ──

  const { reportContentHeight } = useAutoResizeWindow({
    width: WINDOW_FIXED_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    maxHeight: WINDOW_MAX_HEIGHT,
    verticalPadding: WINDOW_VERTICAL_PADDING,
  });

  useGlobalShortcuts({
    isSettingsOpen,
    stage,
    hasBlockingError,
    customRoleHotkey: CUSTOM_ROLE_HOTKEY,
    onOpenSettings: handleOpenSettings,
    onCloseSettings: closeSettings,
    onTerminateSession: handleTerminateSession,
    onSelectRoleHotkey: selectRoleByHotkey,
    onStartCustomRoleEditing: startCustomRoleEditing,
    onStartGenerating: handleStartGenerating,
    onConfirmAndCopy: handleConfirmAndCopy,
    onSaveSettings: handleSaveSettings,
    isSettingsBusy,
  });

  // ── Derived values ──

  const resultVisible = stage === "GENERATING" || stage === "FINISHED";
  const panelWidthClass = resultVisible
    ? "w-[96vw] max-w-[980px]"
    : "w-[92vw] max-w-[720px]";

  // ── Render ──

  return (
    <>
      {isAwake ? (
        <FlipCard
          isFlipped={isSettingsOpen}
          panelRef={panelRef}
          panelAnimateKey={panelAnimateKey}
          panelWidthClass={panelWidthClass}
          minHeight={WINDOW_MIN_HEIGHT}
          onContentHeightChange={reportContentHeight}
          front={
              <WorkArea
              stage={stage}
              rawText={rawText}
              targetRole={targetRole}
              customRoleName={customRoleName}
              customRoleDraft={customRoleDraft}
              isCustomRoleEditing={isCustomRoleEditing}
              contextText={contextText}
              roleMeta={roleMeta}
              streamedText={streamedText}
              isStreaming={isStreaming}
              isSettingsOpen={isSettingsOpen}
              hasBlockingError={hasBlockingError}
              onRawTextChange={setRawText}
              onSelectPresetRole={selectPresetRole}
              onStartCustomRoleEditing={startCustomRoleEditing}
              onCustomRoleDraftChange={setCustomRoleDraft}
              onCancelCustomRoleEditing={cancelCustomRoleEditing}
              onConfirmCustomRole={confirmCustomRole}
              onContextTextChange={setContextText}
              onGenerate={handleStartGenerating}
              onOpenSettings={handleOpenSettings}
              onCancel={handleTerminateSession}
              onConfirmAndCopy={handleConfirmAndCopy}
            />
          }
          back={
            <SettingsPanel
              settingsDraft={settingsDraft}
              isSettingsBusy={isSettingsBusy}
              onFlipBack={closeSettings}
              onFieldChange={onFieldChange}
              onSave={handleSaveSettings}
              onTestApi={handleTestApi}
            />
          }
        />
      ) : null}

      <ZenToast toast={toast} />
    </>
  );
}

export default App;
