import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { hasApiKey, type AppSettings } from "../features/settings/store";
import { buildPrompt } from "../features/zenreply/prompt";
import {
  ROLE_OPTIONS,
  type PresetTargetRole,
  type Stage,
  type TargetRole,
} from "../features/zenreply/types";
import { useLlmStream, type LlmApiConfig } from "./useLlmStream";
import type { ToastVariant } from "./useToast";
import { toErrorMessage } from "../shared/utils";

const CLIPBOARD_EVENT = "zenreply://clipboard-text";
const CLIPBOARD_CAPTURED_EVENT = "zenreply://clipboard-captured";
const MISSING_API_KEY_ERROR = "请先设置 API Key";
const EMPTY_TEXT_ERROR = "原始文本不能为空";

type ClipboardPayload = {
  text: string;
};

/** Cross-concern callbacks exposed by useSettings that the flow needs. */
export type SettingsDeps = {
  syncSettingsFromStore: () => Promise<AppSettings | null>;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showToast: (message: string, variant: ToastVariant, durationMs?: number) => void;
};

export function useZenReplyFlow(settings: SettingsDeps) {
  const [stage, setStage] = useState<Stage>("INPUT");
  const [rawText, setRawText] = useState("");
  const [contextText, setContextText] = useState("");
  const [targetRole, setTargetRole] = useState<TargetRole>("boss");
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRoleDraft, setCustomRoleDraft] = useState("");
  const [isCustomRoleEditing, setIsCustomRoleEditing] = useState(false);
  const [hasBlockingError, setHasBlockingError] = useState(false);
  const [panelAnimateKey, setPanelAnimateKey] = useState(0);
  const [isAwake, setIsAwake] = useState(false);

  const hideTimerRef = useRef<number | null>(null);
  const previousPresetRoleRef = useRef<Exclude<TargetRole, "custom">>("boss");

  const {
    streamedText,
    isStreaming,
    streamError,
    startStream,
    stopStream,
    resetStream,
  } = useLlmStream();

  const showError = useCallback(
    (message: string) => {
      setHasBlockingError(true);
      settings.showToast(message, "error");
    },
    [settings],
  );

  const clearError = useCallback(() => {
    setHasBlockingError(false);
  }, []);

  const roleMeta = useMemo(
    () => ROLE_OPTIONS.find((role) => role.id === targetRole),
    [targetRole],
  );

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

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
    settings.setIsSettingsOpen(false);
    setStage("INPUT");
    setIsAwake(false);
  }, [clearError, clearHideTimer, resetStream, settings, stopStream]);

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
      settings.showToast("窗口关闭失败，请重试", "error");
      return;
    }

    resetFlow();
  }, [clearHideTimer, forceHideWindow, resetFlow, resetStream, settings, stopStream]);

  const onWake = useCallback(
    (incomingText: string) => {
      clearHideTimer();
      stopStream();
      resetStream();
      clearError();
      setRawText(incomingText.trim());
      setContextText("");
      setCustomRoleDraft("");
      setIsCustomRoleEditing(false);
      setStage("INPUT");
      setIsAwake(true);
      setPanelAnimateKey((value) => value + 1);
    },
    [clearError, clearHideTimer, resetStream, stopStream],
  );

  const startGenerating = useCallback(
    async (customRoleOverride?: string) => {
      try {
        if (!rawText.trim()) {
          setStage("INPUT");
          showError(EMPTY_TEXT_ERROR);
          return;
        }

        const customRoleFinal = (customRoleOverride ?? customRoleName).trim();
        if (targetRole === "custom" && !customRoleFinal) {
          settings.showToast("请先输入自定义对象身份", "info");
          return;
        }

        const currentSettings = await settings.syncSettingsFromStore();
        if (!currentSettings) {
          setStage("INPUT");
          showError("无法读取设置，请稍后重试。");
          return;
        }

        if (!hasApiKey(currentSettings)) {
          setStage("INPUT");
          settings.setIsSettingsOpen(true);
          showError(MISSING_API_KEY_ERROR);
          return;
        }

        const apiConfig: LlmApiConfig = {
          apiKey: currentSettings.api_key,
          apiBase: currentSettings.api_base,
          modelName: currentSettings.model_name,
        };

        const prompt = buildPrompt({
          rawText,
          targetRole,
          contextText,
          customRoleInput: customRoleFinal,
        });

        clearError();
        settings.setIsSettingsOpen(false);
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
    },
    [
      clearError,
      contextText,
      customRoleName,
      rawText,
      settings,
      showError,
      startStream,
      targetRole,
    ],
  );

  const startCustomRoleEditing = useCallback(() => {
    if (targetRole !== "custom") {
      previousPresetRoleRef.current = targetRole;
    }

    setTargetRole("custom");
    setCustomRoleDraft(customRoleName);
    setIsCustomRoleEditing(true);
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
      settings.showToast("请输入自定义对象身份", "info");
      return;
    }

    setCustomRoleName(confirmedRole);
    setTargetRole("custom");
    setIsCustomRoleEditing(false);
    setCustomRoleDraft(confirmedRole);
    void startGenerating(confirmedRole);
  }, [customRoleDraft, settings, startGenerating]);

  const confirmAndCopy = useCallback(async () => {
    const output = streamedText.trim();
    if (!output || stage !== "FINISHED") {
      return;
    }

    try {
      await writeText(output);
      settings.showToast("已复制到剪贴板", "success");

      clearHideTimer();
      hideTimerRef.current = window.setTimeout(() => {
        void terminateSession();
      }, 800);
    } catch {
      settings.showToast("复制失败，请重试", "error");
    }
  }, [clearHideTimer, settings, stage, streamedText, terminateSession]);

  const selectPresetRole = useCallback((role: PresetTargetRole) => {
    previousPresetRoleRef.current = role;
    setTargetRole(role);
    setIsCustomRoleEditing(false);
  }, []);

  const selectRoleByHotkey = useCallback(
    (hotkey: 1 | 2 | 3) => {
      const role = ROLE_OPTIONS.find((item) => item.hotkey === hotkey);
      if (role) {
        selectPresetRole(role.id);
      }
    },
    [selectPresetRole],
  );

  // ── Clipboard listeners ──
  useEffect(() => {
    let unlistenWake: (() => void) | null = null;
    let unlistenCapture: (() => void) | null = null;
    let active = true;

    // Primary wake event — window just became visible, reset UI
    void listen<ClipboardPayload>(CLIPBOARD_EVENT, (event) => {
      onWake(event.payload.text || "");
    }).then((cleanup) => {
      if (!active) { cleanup(); return; }
      unlistenWake = cleanup;
    });

    // Async clipboard delivery — arrives after background capture completes
    void listen<ClipboardPayload>(CLIPBOARD_CAPTURED_EVENT, (event) => {
      const text = (event.payload.text || "").trim();
      if (text) setRawText(text);
    }).then((cleanup) => {
      if (!active) { cleanup(); return; }
      unlistenCapture = cleanup;
    });

    return () => {
      active = false;
      unlistenWake?.();
      unlistenCapture?.();
      clearHideTimer();
      stopStream();
    };
  }, [clearHideTimer, onWake, stopStream]);

  // ── Sync stream errors to transient error display ──
  useEffect(() => {
    if (!streamError) {
      return;
    }
    setStage("INPUT");
    showError(streamError);
  }, [showError, streamError]);

  return {
    // State
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
    streamedText,
    isStreaming,
    roleMeta,

    // Setters
    setRawText,
    setCustomRoleDraft,
    setContextText,
    clearError,

    // Actions
    startGenerating,
    startCustomRoleEditing,
    cancelCustomRoleEditing,
    confirmCustomRole,
    confirmAndCopy,
    selectPresetRole,
    selectRoleByHotkey,
    terminateSession,
  };
}
