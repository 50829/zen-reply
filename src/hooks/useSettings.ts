import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  readSettings,
  saveSettings as saveSettingsToStore,
  type AppSettings,
} from "../features/settings/store";
import { toErrorMessage } from "../shared/utils";
import type { ToastVariant } from "./useToast";

type UseSettingsOptions = {
  showToast?: (message: string, variant: ToastVariant, durationMs?: number) => void;
};

export function useSettings(options?: UseSettingsOptions) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsBusy, setIsSettingsBusy] = useState(false);

  const toast = options?.showToast;

  const syncSettingsFromStore = useCallback(async (): Promise<AppSettings | null> => {
    try {
      const current = await readSettings();
      setSettingsDraft(current);
      return current;
    } catch (error) {
      toast?.(toErrorMessage(error), "error");
      return null;
    }
  }, [toast]);

  const openSettings = useCallback(
    async (toastMessage?: string) => {
      await syncSettingsFromStore();
      if (toastMessage) {
        toast?.(toastMessage, "info");
      }
      setIsSettingsOpen(true);
    },
    [syncSettingsFromStore, toast],
  );

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const onFieldChange = useCallback((key: keyof AppSettings, value: string) => {
    setSettingsDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }, []);

  const saveSettings = useCallback(async () => {
    setIsSettingsBusy(true);
    try {
      const normalized = normalizeSettings(settingsDraft);
      const saved = await saveSettingsToStore(normalized);
      setSettingsDraft(saved);
      toast?.("设置已保存", "success");
    } catch (error) {
      toast?.(toErrorMessage(error), "error");
    } finally {
      setIsSettingsBusy(false);
    }
  }, [settingsDraft, toast]);

  const testApiConnection = useCallback(async () => {
    const normalized = normalizeSettings(settingsDraft);
    if (!normalized.api_key) {
      toast?.("请先填写 API Key", "error");
      return;
    }

    setIsSettingsBusy(true);
    toast?.("测试中...", "info", 10_000);
    try {
      await invoke<string>("test_api_connection", {
        apiKey: normalized.api_key,
        apiBase: normalized.api_base,
        modelName: normalized.model_name,
      });
      toast?.("API 连接成功", "success");
    } catch (error) {
      toast?.(toErrorMessage(error), "error");
    } finally {
      setIsSettingsBusy(false);
    }
  }, [settingsDraft, toast]);

  // Load settings on mount
  useEffect(() => {
    void syncSettingsFromStore();
  }, [syncSettingsFromStore]);

  return {
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
  };
}
