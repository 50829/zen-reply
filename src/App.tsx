import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { AnimatePresence, motion } from "framer-motion";
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
  CUSTOM_ROLE_DEFAULT_LABEL,
  CUSTOM_ROLE_HOTKEY,
  ROLE_OPTIONS,
  type Stage,
  type TargetRole,
} from "./features/zenreply/types";
import { useLlmStream, type LlmApiConfig } from "./hooks/useLlmStream";

const CLIPBOARD_EVENT = "zenreply://clipboard-text";
const SUCCESS_TOAST = "✅ 已复制";
const COPY_FAIL_TOAST = "复制失败，请重试";
const HIDE_FAIL_TOAST = "窗口关闭失败，请重试";
const SETTINGS_REQUIRED_TOAST = "请先在设置中填写 API Key";
const MISSING_API_KEY_ERROR = "请先设置 API Key 以开启魔法。";

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
  const [errorText, setErrorText] = useState("");
  const [showGoSettingsButton, setShowGoSettingsButton] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const errorTimerRef = useRef<number | null>(null);
  const customRoleInputRef = useRef<HTMLInputElement | null>(null);
  const previousPresetRoleRef = useRef<Exclude<TargetRole, "custom">>("boss");

  const {
    streamedText,
    isStreaming,
    streamError,
    startStream,
    stopStream,
    resetStream,
  } = useLlmStream();

  const roleMeta = useMemo(
    () => ROLE_OPTIONS.find((role) => role.id === targetRole),
    [targetRole],
  );

  const stageLabel = useMemo(() => {
    if (stage === "IDLE") return "IDLE";
    if (stage === "INPUT") return "INPUT";
    if (stage === "GENERATING") return "GENERATING";
    if (stage === "ERROR") return "ERROR";
    return "FINISHED";
  }, [stage]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearErrorTimer = useCallback(() => {
    if (errorTimerRef.current) {
      window.clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
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

  const enterErrorState = useCallback((message: string, allowOpenSettings: boolean) => {
    setStage("ERROR");
    setErrorText(message);
    setShowGoSettingsButton(allowOpenSettings);
  }, []);

  const resetFlow = useCallback(() => {
    clearHideTimer();
    clearErrorTimer();
    stopStream();
    resetStream();
    setRawText("");
    setContextText("");
    setTargetRole("boss");
    setCustomRoleName("");
    setCustomRoleDraft("");
    setIsCustomRoleEditing(false);
    previousPresetRoleRef.current = "boss";
    setToastText("");
    setSettingsFeedback("");
    setErrorText("");
    setShowGoSettingsButton(false);
    setIsSettingsOpen(false);
    setStage("IDLE");
  }, [clearErrorTimer, clearHideTimer, resetStream, stopStream]);

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
      setToastText("");
      setErrorText("");
      setShowGoSettingsButton(false);
      setRawText(incomingText.trim());
      setContextText("");
      setCustomRoleDraft("");
      setIsCustomRoleEditing(false);
      setStage("INPUT");
      setPanelAnimateKey((value) => value + 1);
    },
    [clearHideTimer, resetStream, stopStream],
  );

  const startGenerating = useCallback(async (customRoleOverride?: string) => {
    try {
      if (!rawText.trim()) {
        setToastText("请先选中文本后按 Alt+Space");
        return;
      }

      const customRoleFinal = (customRoleOverride ?? customRoleName).trim();
      if (targetRole === "custom" && !customRoleFinal) {
        setToastText("请先输入自定义对象身份");
        return;
      }

      const settings = await syncSettingsFromStore();
      if (!settings) {
        enterErrorState("无法读取设置，请稍后重试。", false);
        return;
      }

      if (!hasApiKey(settings)) {
        setSettingsFeedback("请先填写 API Key");
        setToastText(SETTINGS_REQUIRED_TOAST);
        enterErrorState(MISSING_API_KEY_ERROR, true);
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
      setErrorText("");
      setShowGoSettingsButton(false);
      setIsSettingsOpen(false);
      setStage("GENERATING");
      startStream(prompt, {
        apiConfig,
        onDone: () => {
          setStage("FINISHED");
        },
        onError: (message) => {
          enterErrorState(message, false);
        },
      });
    } catch (error) {
      enterErrorState(toErrorMessage(error), false);
    }
  }, [
    contextText,
    customRoleName,
    enterErrorState,
    rawText,
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
    if (streamError) {
      enterErrorState(streamError, false);
    }
  }, [enterErrorState, streamError]);

  useEffect(() => {
    if (stage !== "ERROR") {
      clearErrorTimer();
      return;
    }

    clearErrorTimer();
    errorTimerRef.current = window.setTimeout(() => {
      resetFlow();
    }, 3000);

    return () => {
      clearErrorTimer();
    };
  }, [clearErrorTimer, errorText, resetFlow, stage]);

  useEffect(() => {
    if (!isCustomRoleEditing) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      customRoleInputRef.current?.focus();
      customRoleInputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [isCustomRoleEditing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if ((event.metaKey || event.ctrlKey) && event.key === ",") {
        event.preventDefault();
        if (isSettingsOpen) {
          closeSettings();
        } else {
          void openSettings();
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (isSettingsOpen) {
          closeSettings();
          return;
        }
        void terminateSession();
        return;
      }

      if (isSettingsOpen) {
        return;
      }

      if (!isTyping && stage === "INPUT") {
        if (event.key >= "1" && event.key <= "3") {
          const hotkey = Number(event.key) as 1 | 2 | 3;
          const role = ROLE_OPTIONS.find((item) => item.hotkey === hotkey);
          if (role) {
            previousPresetRoleRef.current = role.id;
            setTargetRole(role.id);
          }
          return;
        }

        if (event.key === String(CUSTOM_ROLE_HOTKEY)) {
          event.preventDefault();
          startCustomRoleEditing();
          return;
        }
      }

      if (event.key === "Enter" && !event.shiftKey) {
        if (stage === "INPUT" || stage === "ERROR") {
          event.preventDefault();
          void startGenerating();
          return;
        }

        if (stage === "FINISHED") {
          event.preventDefault();
          void confirmAndCopy();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    closeSettings,
    confirmAndCopy,
    isSettingsOpen,
    openSettings,
    stage,
    startCustomRoleEditing,
    startGenerating,
    terminateSession,
  ]);

  const controlsVisible = stage === "INPUT" || stage === "IDLE" || stage === "ERROR";
  const resultVisible =
    stage === "GENERATING" || stage === "FINISHED" || stage === "ERROR";
  const panelWidthClass = resultVisible
    ? "w-[96vw] max-w-[980px]"
    : "w-[92vw] max-w-[720px]";

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-4">
      <motion.section
        key={panelAnimateKey}
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        className={`transition-[max-width,width] duration-300 ${panelWidthClass}`}
      >
        <div className="rounded-[24px] border border-white/30 bg-white/[0.08] p-[2px] shadow-[0_20px_70px_rgba(255,255,255,0.12)]">
          <motion.main className="relative flex w-full flex-col overflow-hidden rounded-[21px] border border-white/10 bg-black/86 p-5 text-zinc-100 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(255,255,255,0.05),0_20px_80px_rgba(0,0,0,0.78),0_0_32px_rgba(34,211,238,0.15)]">
            <header className="mb-4 flex shrink-0 items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">ZenReply</h1>
                <p className="mt-1 text-xs text-zinc-400">
                  Alt+Space 唤醒，Enter 生成/确认，Esc 取消，Ctrl/Cmd + , 设置
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="打开设置 (Ctrl/Cmd + ,)"
                  aria-label="打开设置"
                  onClick={() => void openSettings()}
                  className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[13px] text-zinc-200 transition hover:border-cyan-300/50 hover:text-cyan-100"
                >
                  ⚙
                </button>
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-zinc-300">
                  {stageLabel}
                </span>
              </div>
            </header>

            <div className="flex-1">
              <section className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
                <p className="mb-2 text-xs text-zinc-400">原始文本</p>
                <p className="zen-scrollbar max-h-28 min-h-[3rem] overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-6 text-zinc-100">
                  {rawText || "请在聊天框选中文本后按 Alt+Space"}
                </p>
              </section>

              <AnimatePresence initial={false}>
                {controlsVisible && (
                  <motion.section
                    initial={{ height: 0, opacity: 0, y: -10 }}
                    animate={{ height: "auto", opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -12 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
                      <p className="mb-2 text-xs text-zinc-400">沟通对象</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {ROLE_OPTIONS.map((role) => {
                          const active = targetRole === role.id;
                          return (
                            <button
                              key={role.id}
                              type="button"
                              onClick={() => {
                                previousPresetRoleRef.current = role.id;
                                setTargetRole(role.id);
                                setIsCustomRoleEditing(false);
                              }}
                              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                active
                                  ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-100"
                                  : "border-white/15 bg-white/5 text-zinc-200 hover:border-white/35"
                              }`}
                            >
                              {role.hotkey}. {role.label}
                            </button>
                          );
                        })}

                        <motion.div layout className="min-w-[170px] max-w-full">
                          <AnimatePresence initial={false} mode="wait">
                            {isCustomRoleEditing ? (
                              <motion.input
                                key="custom-role-input"
                                layout
                                ref={customRoleInputRef}
                                autoFocus
                                value={customRoleDraft}
                                onChange={(event) =>
                                  setCustomRoleDraft(event.currentTarget.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    confirmCustomRole();
                                    return;
                                  }

                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    cancelCustomRoleEditing();
                                  }
                                }}
                                placeholder="输入对方身份 (按 Enter 确认)"
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.18 }}
                                className="w-full rounded-full border border-cyan-300/50 bg-cyan-300/15 px-3 py-1.5 text-xs text-cyan-100 outline-none placeholder:text-cyan-200/65"
                              />
                            ) : (
                              <motion.button
                                key={`custom-role-button-${customRoleName || "empty"}`}
                                layout
                                type="button"
                                onClick={startCustomRoleEditing}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.18 }}
                                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                  targetRole === "custom"
                                    ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-100"
                                    : "border-white/15 bg-white/5 text-zinc-200 hover:border-white/35"
                                }`}
                              >
                                {CUSTOM_ROLE_HOTKEY}.{" "}
                                {targetRole === "custom" && customRoleName
                                  ? customRoleName
                                  : CUSTOM_ROLE_DEFAULT_LABEL}
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {targetRole === "custom"
                          ? customRoleName
                            ? `已自定义对象：${customRoleName}（会自动推断权力关系与语气边界）`
                            : "可输入任何对象身份，例如：奇葩房东、催命 HR、难缠亲戚"
                          : roleMeta?.vibe}
                      </p>

                      <input
                        value={contextText}
                        onChange={(event) => setContextText(event.currentTarget.value)}
                        placeholder="对方说了什么？(可选)"
                        className="mt-3 w-full rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
                      />

                      <button
                        type="button"
                        onClick={() => void startGenerating()}
                        className="mt-3 w-full rounded-[14px] border border-cyan-300/45 bg-cyan-300/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/25"
                      >
                        ✨ 生成回复
                      </button>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {resultVisible && (
                  <motion.section
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
                      {stage === "ERROR" ? (
                        <div className="rounded-[14px] border border-rose-300/35 bg-rose-300/10 p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-sm text-rose-200">❌</span>
                            <div>
                              <p className="text-xs text-rose-200">生成失败</p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-rose-100">
                                {errorText || "请求失败，请稍后重试。"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-end gap-2">
                            {showGoSettingsButton && (
                              <button
                                type="button"
                                onClick={() => void openSettings()}
                                className="rounded-[12px] border border-cyan-300/45 bg-cyan-300/15 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/25"
                              >
                                去设置
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => void startGenerating()}
                              className="rounded-[12px] border border-rose-300/45 bg-rose-300/20 px-3 py-1.5 text-xs font-medium text-rose-100 transition hover:bg-rose-300/30"
                            >
                              重试
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mb-2 text-xs text-zinc-400">结果展示区</p>
                          <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-100">
                            {streamedText}
                            {isStreaming && <span className="zen-cursor ml-1">▌</span>}
                          </p>

                          <AnimatePresence>
                            {stage === "FINISHED" && (
                              <motion.div
                                initial={{ opacity: 0, x: 16, y: 8 }}
                                animate={{ opacity: 1, x: 0, y: 0 }}
                                exit={{ opacity: 0, x: 12, y: 4 }}
                                transition={{ duration: 0.2 }}
                                className="mt-4 flex items-center justify-end gap-2"
                              >
                                <button
                                  type="button"
                                  onClick={() => void terminateSession()}
                                  className="rounded-[12px] border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-white/30"
                                >
                                  Esc 取消
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void confirmAndCopy()}
                                  className="rounded-[12px] border border-emerald-300/50 bg-emerald-300/20 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-300/30"
                                >
                                  ↵ 确认并复制
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {isSettingsOpen && (
                <>
                  <motion.button
                    type="button"
                    aria-label="关闭设置"
                    className="absolute inset-0 z-20 cursor-default bg-black/45 backdrop-blur-[1px]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeSettings}
                  />
                  <motion.aside
                    initial={{ x: 32, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 24, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-y-0 right-0 z-30 flex w-full max-w-[430px] flex-col border-l border-white/15 bg-black/90 p-4 backdrop-blur-2xl"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-base font-semibold text-zinc-100">设置</h2>
                        <p className="mt-1 text-xs text-zinc-400">
                          API Key 会保存在本地 Store。快捷键：Ctrl/Cmd + ,
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeSettings}
                        className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-300 transition hover:border-white/35"
                      >
                        关闭
                      </button>
                    </div>

                    <label className="mb-2 text-xs text-zinc-300">api_key</label>
                    <input
                      type="password"
                      value={settingsDraft.api_key}
                      onChange={(event) =>
                        onSettingsFieldChange("api_key", event.currentTarget.value)
                      }
                      placeholder="输入 API Key"
                      className="mb-3 w-full rounded-[12px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
                    />

                    <label className="mb-2 text-xs text-zinc-300">api_base</label>
                    <input
                      type="text"
                      value={settingsDraft.api_base}
                      onChange={(event) =>
                        onSettingsFieldChange("api_base", event.currentTarget.value)
                      }
                      placeholder="https://api.siliconflow.cn/v1"
                      className="mb-3 w-full rounded-[12px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
                    />

                    <label className="mb-2 text-xs text-zinc-300">model_name</label>
                    <input
                      type="text"
                      value={settingsDraft.model_name}
                      onChange={(event) =>
                        onSettingsFieldChange("model_name", event.currentTarget.value)
                      }
                      placeholder="Pro/MiniMaxAI/MiniMax-M2.5"
                      className="w-full rounded-[12px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
                    />

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void saveSettingsDraft()}
                        disabled={isSettingsBusy}
                        className="rounded-[10px] border border-cyan-300/45 bg-cyan-300/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        保存设置
                      </button>
                      <button
                        type="button"
                        onClick={() => void testApiConnection()}
                        disabled={isSettingsBusy}
                        className="rounded-[10px] border border-emerald-300/45 bg-emerald-300/15 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-300/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        测试 API
                      </button>
                    </div>

                    <p className="mt-3 min-h-5 text-xs text-zinc-300">
                      {settingsFeedback ||
                        "提示：保存后会持久化到本地，发起请求时会自动读取。"}
                    </p>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
          </motion.main>
        </div>
      </motion.section>

      <AnimatePresence>
        {toastText && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-none absolute bottom-4 rounded-[12px] border px-4 py-2 text-xs ${
              toastText.startsWith("✅")
                ? "border-emerald-300/45 bg-emerald-300/20 text-emerald-100"
                : "border-rose-300/40 bg-rose-300/20 text-rose-100"
            }`}
          >
            {toastText}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
