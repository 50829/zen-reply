import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { AnimatePresence, motion } from "framer-motion";
import { ErrorToast } from "./components/feedback/ErrorToast";
import { ToastBar } from "./components/feedback/ToastBar";
import { SettingsPanel } from "./components/settings/SettingsPanel";
import { ResultCard } from "./components/zenreply/ResultCard";
import { RoleComposer } from "./components/zenreply/RoleComposer";
import { SourceTextCard } from "./components/zenreply/SourceTextCard";
import {
  DEFAULT_SETTINGS,
  hasApiKey,
  normalizeSettings,
  readSettings,
  saveSettings,
  type AppSettings,
} from "./features/settings/store";
import { buildPrompt } from "./features/zenreply/prompt";
import {
  CUSTOM_ROLE_HOTKEY,
  ROLE_OPTIONS,
  type PresetTargetRole,
  type Stage,
  type TargetRole,
} from "./features/zenreply/types";
import { useAutoResizeWindow } from "./hooks/useAutoResizeWindow";
import { useGlobalShortcuts } from "./hooks/useGlobalShortcuts";
import { useLlmStream, type LlmApiConfig } from "./hooks/useLlmStream";
import { useTransientError } from "./hooks/useTransientError";

const CLIPBOARD_EVENT = "zenreply://clipboard-text";
const SUCCESS_TOAST = "✅ 已复制";
const COPY_FAIL_TOAST = "复制失败，请重试";
const HIDE_FAIL_TOAST = "窗口关闭失败，请重试";
const SETTINGS_REQUIRED_TOAST = "请先在设置中填写 API Key";
const MISSING_API_KEY_ERROR = "请先设置 API Key 以开启魔法。";
const EMPTY_TEXT_ERROR = "请先选中文本后再按 Alt+Space唤起窗口。";
const ERROR_DISPLAY_MS = 2_000;
const WINDOW_FIXED_WIDTH = 600;
const WINDOW_MIN_HEIGHT = 280;
const WINDOW_MAX_HEIGHT = 980;
const WINDOW_VERTICAL_PADDING = 32;

type ClipboardPayload = {
  text: string;
};

function toErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return "操作失败，请重试";
}

function App() {
  const [stage, setStage] = useState<Stage>("IDLE");
  const [rawText, setRawText] = useState("");
  const [contextText, setContextText] = useState("");
  const [targetRole, setTargetRole] = useState<TargetRole>("boss");
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRoleDraft, setCustomRoleDraft] = useState("");
  const [isCustomRoleEditing, setIsCustomRoleEditing] = useState(false);
  const [toastText, setToastText] = useState("");
  const [panelAnimateKey, setPanelAnimateKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsFeedback, setSettingsFeedback] = useState("");
  const [isSettingsBusy, setIsSettingsBusy] = useState(false);
  const [flipHeight, setFlipHeight] = useState(WINDOW_MIN_HEIGHT);

  const hideTimerRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const previousPresetRoleRef = useRef<Exclude<TargetRole, "custom">>("boss");
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const {
    streamedText,
    isStreaming,
    streamError,
    startStream,
    stopStream,
    resetStream,
  } = useLlmStream();

  const onErrorTimeout = useCallback(() => {
    setStage("INPUT");
  }, []);

  const { errorMessage, showError, clearError } = useTransientError({
    displayMs: ERROR_DISPLAY_MS,
    onTimeout: onErrorTimeout,
  });

  const roleMeta = useMemo(
    () => ROLE_OPTIONS.find((role) => role.id === targetRole),
    [targetRole],
  );

  const stageLabel = useMemo(() => {
    if (stage === "IDLE") return "IDLE";
    if (stage === "INPUT") return "INPUT";
    if (stage === "GENERATING") return "GENERATING";
    return "FINISHED";
  }, [stage]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const syncSettingsFromStore = useCallback(async (): Promise<AppSettings | null> => {
    try {
      const current = await readSettings();
      setSettingsDraft(current);
      return current;
    } catch (error) {
      setToastText(toErrorMessage(error));
      return null;
    }
  }, []);

  const openSettings = useCallback(async (toastMessage?: string) => {
    await syncSettingsFromStore();
    setSettingsFeedback("");
    if (toastMessage) {
      setToastText(toastMessage);
    }
    setIsSettingsOpen(true);
  }, [syncSettingsFromStore]);

  const closeSettings = useCallback(() => {
    setSettingsFeedback("");
    setIsSettingsOpen(false);
  }, []);

  const onSettingsFieldChange = useCallback((key: keyof AppSettings, value: string) => {
    setSettingsFeedback("");
    setSettingsDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }, []);

  const saveSettingsDraft = useCallback(async () => {
    setIsSettingsBusy(true);
    try {
      const normalized = normalizeSettings(settingsDraft);
      const saved = await saveSettings(normalized);
      setSettingsDraft(saved);
      setSettingsFeedback("✅ 设置已保存");
    } catch (error) {
      setSettingsFeedback(`❌ ${toErrorMessage(error)}`);
    } finally {
      setIsSettingsBusy(false);
    }
  }, [settingsDraft]);

  const testApiConnection = useCallback(async () => {
    const normalized = normalizeSettings(settingsDraft);
    if (!normalized.api_key) {
      setSettingsFeedback("❌ 请先填写 API Key");
      return;
    }

    setIsSettingsBusy(true);
    setSettingsFeedback("测试中...");
    try {
      await invoke<string>("test_api_connection", {
        apiKey: normalized.api_key,
        apiBase: normalized.api_base,
        modelName: normalized.model_name,
      });
      setSettingsFeedback("✅ API 连接成功");
    } catch (error) {
      setSettingsFeedback(`❌ ${toErrorMessage(error)}`);
    } finally {
      setIsSettingsBusy(false);
    }
  }, [settingsDraft]);

  const resetFlow = useCallback(() => {
    clearHideTimer();
    stopStream();
    resetStream();
    clearError();
    setRawText("");
    setContextText("");
    setTargetRole("boss");
    setCustomRoleName("");
    setCustomRoleDraft("");
    setIsCustomRoleEditing(false);
    previousPresetRoleRef.current = "boss";
    setToastText("");
    setSettingsFeedback("");
    setIsSettingsOpen(false);
    setStage("IDLE");
  }, [clearError, clearHideTimer, resetStream, stopStream]);

  const forceHideWindow = useCallback(async (): Promise<boolean> => {
    try {
      await invoke("hide_window");
      return true;
    } catch {
      try {
        await getCurrentWindow().hide();
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  const terminateSession = useCallback(async () => {
    clearHideTimer();
    stopStream();
    resetStream();

    const hidden = await forceHideWindow();
    if (!hidden) {
      setToastText(HIDE_FAIL_TOAST);
      return;
    }

    resetFlow();
  }, [clearHideTimer, forceHideWindow, resetFlow, resetStream, stopStream]);

  const onWake = useCallback(
    (incomingText: string) => {
      clearHideTimer();
      stopStream();
      resetStream();
      clearError();
      setToastText("");
      setRawText(incomingText.trim());
      setContextText("");
      setCustomRoleDraft("");
      setIsCustomRoleEditing(false);
      setStage("INPUT");
      setPanelAnimateKey((value) => value + 1);
    },
    [clearError, clearHideTimer, resetStream, stopStream],
  );

  const startGenerating = useCallback(async (customRoleOverride?: string) => {
    try {
      if (!rawText.trim()) {
        setStage("INPUT");
        showError(EMPTY_TEXT_ERROR);
        return;
      }

      const customRoleFinal = (customRoleOverride ?? customRoleName).trim();
      if (targetRole === "custom" && !customRoleFinal) {
        setToastText("请先输入自定义对象身份");
        return;
      }

      const settings = await syncSettingsFromStore();
      if (!settings) {
        setStage("INPUT");
        showError("无法读取设置，请稍后重试。");
        return;
      }

      if (!hasApiKey(settings)) {
        setSettingsFeedback("请先填写 API Key");
        setToastText(SETTINGS_REQUIRED_TOAST);
        setStage("INPUT");
        setIsSettingsOpen(true);
        showError(MISSING_API_KEY_ERROR);
        return;
      }

      const apiConfig: LlmApiConfig = {
        apiKey: settings.api_key,
        apiBase: settings.api_base,
        modelName: settings.model_name,
      };

      const prompt = buildPrompt({
        rawText,
        targetRole,
        contextText,
        customRoleInput: customRoleFinal,
      });

      setToastText("");
      clearError();
      setIsSettingsOpen(false);
      setStage("GENERATING");

      startStream(prompt, {
        apiConfig,
        onDone: () => {
          setStage("FINISHED");
        },
        onError: (message) => {
          setStage("INPUT");
          showError(message);
        },
      });
    } catch (error) {
      setStage("INPUT");
      showError(toErrorMessage(error));
    }
  }, [
    clearError,
    contextText,
    customRoleName,
    rawText,
    showError,
    startStream,
    syncSettingsFromStore,
    targetRole,
  ]);

  const startCustomRoleEditing = useCallback(() => {
    if (targetRole !== "custom") {
      previousPresetRoleRef.current = targetRole;
    }

    setTargetRole("custom");
    setCustomRoleDraft(customRoleName);
    setIsCustomRoleEditing(true);
    setToastText("");
    setStage("INPUT");
  }, [customRoleName, targetRole]);

  const cancelCustomRoleEditing = useCallback(() => {
    setIsCustomRoleEditing(false);
    setCustomRoleDraft("");

    if (!customRoleName) {
      setTargetRole(previousPresetRoleRef.current);
    }
  }, [customRoleName]);

  const confirmCustomRole = useCallback(() => {
    const confirmedRole = customRoleDraft.trim();
    if (!confirmedRole) {
      setToastText("请输入自定义对象身份");
      return;
    }

    setCustomRoleName(confirmedRole);
    setTargetRole("custom");
    setIsCustomRoleEditing(false);
    setCustomRoleDraft(confirmedRole);
    void startGenerating(confirmedRole);
  }, [customRoleDraft, startGenerating]);

  const confirmAndCopy = useCallback(async () => {
    const output = streamedText.trim();
    if (!output || stage !== "FINISHED") {
      return;
    }

    try {
      await writeText(output);
      setToastText(SUCCESS_TOAST);

      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        void terminateSession();
      }, 800);
    } catch {
      setToastText(COPY_FAIL_TOAST);
    }
  }, [clearHideTimer, stage, streamedText, terminateSession]);

  const selectPresetRole = useCallback((role: PresetTargetRole) => {
    previousPresetRoleRef.current = role;
    setTargetRole(role);
    setIsCustomRoleEditing(false);
  }, []);

  const selectRoleByHotkey = useCallback((hotkey: 1 | 2 | 3) => {
    const role = ROLE_OPTIONS.find((item) => item.hotkey === hotkey);
    if (role) {
      selectPresetRole(role.id);
    }
  }, [selectPresetRole]);

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
    void saveSettingsDraft();
  }, [saveSettingsDraft]);

  const handleTestApi = useCallback(() => {
    void testApiConnection();
  }, [testApiConnection]);

  useEffect(() => {
    void syncSettingsFromStore();
  }, [syncSettingsFromStore]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let active = true;

    void listen<ClipboardPayload>(CLIPBOARD_EVENT, (event) => {
      onWake(event.payload.text || "");
    }).then((cleanup) => {
      if (!active) {
        cleanup();
        return;
      }
      unlisten = cleanup;
    });

    return () => {
      active = false;
      if (unlisten) {
        unlisten();
      }
      clearHideTimer();
      stopStream();
    };
  }, [clearHideTimer, onWake, stopStream]);

  useEffect(() => {
    if (!streamError) {
      return;
    }
    setStage("INPUT");
    showError(streamError);
  }, [showError, streamError]);

  // ── Measure active face height for 3D flip ──
  useEffect(() => {
    const measure = () => {
      const el = isSettingsOpen ? backRef.current : frontRef.current;
      const h = el?.offsetHeight ?? 0;
      if (h > 0) setFlipHeight(h);
    };
    measure();

    const observer = new ResizeObserver(measure);
    if (frontRef.current) observer.observe(frontRef.current);
    if (backRef.current) observer.observe(backRef.current);
    return () => observer.disconnect();
  }, [isSettingsOpen]);

  useAutoResizeWindow({
    panelRef,
    triggerKey: panelAnimateKey,
    width: WINDOW_FIXED_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    maxHeight: WINDOW_MAX_HEIGHT,
    verticalPadding: WINDOW_VERTICAL_PADDING,
  });

  useGlobalShortcuts({
    isSettingsOpen,
    stage,
    hasBlockingError: Boolean(errorMessage),
    customRoleHotkey: CUSTOM_ROLE_HOTKEY,
    onOpenSettings: handleOpenSettings,
    onCloseSettings: closeSettings,
    onTerminateSession: handleTerminateSession,
    onSelectRoleHotkey: selectRoleByHotkey,
    onStartCustomRoleEditing: startCustomRoleEditing,
    onStartGenerating: handleStartGenerating,
    onConfirmAndCopy: handleConfirmAndCopy,
  });

  const controlsVisible = stage === "INPUT" || stage === "IDLE";
  const resultVisible = stage === "GENERATING" || stage === "FINISHED";
  const panelWidthClass = resultVisible
    ? "w-[96vw] max-w-[980px]"
    : "w-[92vw] max-w-[720px]";

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden p-4"
      style={{ perspective: 1200 }}
    >
      <motion.section
        key={panelAnimateKey}
        ref={panelRef}
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d" }}
        className={`transition-[max-width,width] duration-300 ${panelWidthClass}`}
      >
        {/* ── Flip Body ── */}
        <motion.div
          className="relative w-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{
            rotateY: isSettingsOpen ? 180 : 0,
            height: flipHeight,
          }}
          transition={{
            rotateY: { type: "spring", stiffness: 70, damping: 16 },
            height: { type: "spring", stiffness: 170, damping: 24 },
          }}
        >
          {/* ===== FRONT FACE: Work Area ===== */}
          <div
            ref={frontRef}
            className="zen-flip-face absolute inset-x-0 top-0 w-full"
            style={{ pointerEvents: isSettingsOpen ? "none" : "auto" }}
          >
            <div className="rounded-[24px] border border-white/30 bg-white/[0.08] p-[2px] shadow-[0_20px_70px_rgba(255,255,255,0.12)]">
              <main className="relative flex w-full flex-col overflow-hidden rounded-[21px] border border-white/10 bg-black/86 p-5 text-zinc-100 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(255,255,255,0.05),0_20px_80px_rgba(0,0,0,0.78),0_0_32px_rgba(34,211,238,0.15)]">
                <header className="mb-4 flex shrink-0 items-center justify-between">
                  <div>
                    <h1 className="text-xl font-semibold tracking-tight">ZenReply</h1>
                    <p className="mt-1 text-xs text-zinc-400">
                      Alt+Space 唤醒，Enter 生成/确认，Esc 取消，Ctrl/Cmd + , 设置
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      title="打开设置 (Ctrl/Cmd + ,)"
                      aria-label="打开设置"
                      onClick={handleOpenSettings}
                      animate={{ rotate: isSettingsOpen ? 180 : 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[13px] text-zinc-200 transition-colors hover:border-cyan-300/50 hover:text-cyan-100"
                    >
                      ⚙
                    </motion.button>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-zinc-300">
                      {stageLabel}
                    </span>
                  </div>
                </header>

                <div className="flex-1">
                  <SourceTextCard
                    stage={stage}
                    rawText={rawText}
                    onRawTextChange={setRawText}
                  />

                  <AnimatePresence initial={false}>
                    {controlsVisible ? (
                      <motion.section
                        initial={{ height: 0, opacity: 0, y: -10 }}
                        animate={{ height: "auto", opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -12 }}
                        transition={{ duration: 0.24, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <RoleComposer
                          targetRole={targetRole}
                          customRoleName={customRoleName}
                          customRoleDraft={customRoleDraft}
                          isCustomRoleEditing={isCustomRoleEditing}
                          contextText={contextText}
                          roleVibe={roleMeta?.vibe}
                          isStreaming={isStreaming}
                          hasError={Boolean(errorMessage)}
                          onSelectPresetRole={selectPresetRole}
                          onStartCustomRoleEditing={startCustomRoleEditing}
                          onCustomRoleDraftChange={setCustomRoleDraft}
                          onCancelCustomRoleEditing={cancelCustomRoleEditing}
                          onConfirmCustomRole={confirmCustomRole}
                          onContextTextChange={setContextText}
                          onGenerate={handleStartGenerating}
                        />
                      </motion.section>
                    ) : null}
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {resultVisible ? (
                      <ResultCard
                        stage={stage}
                        streamedText={streamedText}
                        isStreaming={isStreaming}
                        onCancel={handleTerminateSession}
                        onConfirmAndCopy={handleConfirmAndCopy}
                      />
                    ) : null}
                  </AnimatePresence>
                </div>
              </main>
            </div>
          </div>

          {/* ===== BACK FACE: Settings ===== */}
          <div
            ref={backRef}
            className="zen-flip-face absolute inset-x-0 top-0 w-full"
            style={{
              transform: "rotateY(180deg)",
              pointerEvents: isSettingsOpen ? "auto" : "none",
            }}
          >
            <SettingsPanel
              settingsDraft={settingsDraft}
              settingsFeedback={settingsFeedback}
              isSettingsBusy={isSettingsBusy}
              onFlipBack={closeSettings}
              onFieldChange={onSettingsFieldChange}
              onSave={handleSaveSettings}
              onTestApi={handleTestApi}
            />
          </div>
        </motion.div>
      </motion.section>

      <ErrorToast message={errorMessage} />
      <ToastBar message={toastText} />
    </div>
  );
}

export default App;
