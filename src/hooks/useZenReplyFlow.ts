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
import { useTransientError } from "./useTransientError";
import { toErrorMessage } from "../shared/utils";

const CLIPBOARD_EVENT = "zenreply://clipboard-text";
const SUCCESS_TOAST = "✅ 已复制";
const COPY_FAIL_TOAST = "复制失败，请重试";
const HIDE_FAIL_TOAST = "窗口关闭失败，请重试";
const SETTINGS_REQUIRED_TOAST = "请先在设置中填写 API Key";
const MISSING_API_KEY_ERROR = "请先设置 API Key 以开启魔法。";
const EMPTY_TEXT_ERROR = "请先选中文本后再按 Alt+Space唤起窗口。";
const ERROR_DISPLAY_MS = 2_000;

type ClipboardPayload = {
  text: string;
};

/** Cross-concern callbacks exposed by useSettings that the flow needs. */
export type SettingsDeps = {
  syncSettingsFromStore: () => Promise<AppSettings | null>;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSettingsFeedback: React.Dispatch<React.SetStateAction<string>>;
};

export function useZenReplyFlow(settings: SettingsDeps) {
  const [stage, setStage] = useState<Stage>("IDLE");
  const [rawText, setRawText] = useState("");
  const [contextText, setContextText] = useState("");
  const [targetRole, setTargetRole] = useState<TargetRole>("boss");
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRoleDraft, setCustomRoleDraft] = useState("");
  const [isCustomRoleEditing, setIsCustomRoleEditing] = useState(false);
  const [toastText, setToastText] = useState("");
  const [panelAnimateKey, setPanelAnimateKey] = useState(0);

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
    settings.setSettingsFeedback("");
    settings.setIsSettingsOpen(false);
    setStage("IDLE");
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
          setToastText("请先输入自定义对象身份");
          return;
        }

        const currentSettings = await settings.syncSettingsFromStore();
        if (!currentSettings) {
          setStage("INPUT");
          showError("无法读取设置，请稍后重试。");
          return;
        }

        if (!hasApiKey(currentSettings)) {
          settings.setSettingsFeedback("请先填写 API Key");
          setToastText(SETTINGS_REQUIRED_TOAST);
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

        setToastText("");
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

  const selectRoleByHotkey = useCallback(
    (hotkey: 1 | 2 | 3) => {
      const role = ROLE_OPTIONS.find((item) => item.hotkey === hotkey);
      if (role) {
        selectPresetRole(role.id);
      }
    },
    [selectPresetRole],
  );

  // ── Clipboard listener ──
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
    toastText,
    panelAnimateKey,
    errorMessage,
    streamedText,
    isStreaming,
    stageLabel,
    roleMeta,

    // Setters
    setRawText,
    setCustomRoleDraft,
    setContextText,
    setToastText,

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
