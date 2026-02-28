import { createContext, useContext, type ReactNode } from "react";
import { useSettings } from "../hooks/useSettings";
import { useToastContext } from "./ToastContext";
import type { AppSettings } from "../features/settings/store";

type SettingsContextValue = {
  isSettingsOpen: boolean;
  settingsDraft: AppSettings;
  isSettingsBusy: boolean;
  setIsSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  syncSettingsFromStore: () => Promise<AppSettings | null>;
  openSettings: (toastMessage?: string) => Promise<void>;
  closeSettings: () => void;
  onFieldChange: (key: keyof AppSettings, value: string) => void;
  saveSettings: () => Promise<void>;
  testApiConnection: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsContext must be used inside <SettingsProvider>");
  return ctx;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToastContext();

  const settings = useSettings({ showToast });

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}
