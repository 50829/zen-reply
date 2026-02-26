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

type UseSettingsOptions = {
  onToast?: (message: string) => void;
};

export function useSettings(options?: UseSettingsOptions) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsFeedback, setSettingsFeedback] = useState("");
  const [isSettingsBusy, setIsSettingsBusy] = useState(false);

  const toast = options?.onToast;

  const syncSettingsFromStore = useCallback(async (): Promise<AppSettings | null> => {
    try {
      const current = await readSettings();
      setSettingsDraft(current);
      return current;
    } catch (error) {
      toast?.(toErrorMessage(error));
      return null;
    }
  }, [toast]);

  const openSettings = useCallback(
    async (toastMessage?: string) => {
      await syncSettingsFromStore();
      setSettingsFeedback("");
      if (toastMessage) {
        toast?.(toastMessage);
      }
      setIsSettingsOpen(true);
    },
    [syncSettingsFromStore, toast],
  );

  const closeSettings = useCallback(() => {
    setSettingsFeedback("");
    setIsSettingsOpen(false);
  }, []);

  const onFieldChange = useCallback((key: keyof AppSettings, value: string) => {
    setSettingsFeedback("");
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

  // Load settings on mount
  useEffect(() => {
    void syncSettingsFromStore();
  }, [syncSettingsFromStore]);

  return {
    isSettingsOpen,
    settingsDraft,
    settingsFeedback,
    isSettingsBusy,
    setIsSettingsOpen,
    setSettingsFeedback,
    syncSettingsFromStore,
    openSettings,
    closeSettings,
    onFieldChange,
    saveSettings,
    testApiConnection,
  };
}
