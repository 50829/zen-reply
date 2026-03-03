import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useZenReplyFlow } from "../hooks/useZenReplyFlow";
import { useToastContext } from "./ToastContext";
import { useSettingsContext } from "./SettingsContext";
import type {
  Mode,
  PresetTargetRole,
  Stage,
  StyleOption,
  TargetRole,
  RoleOption,
  TranslateStyle,
} from "../features/zenreply/types";

type ZenReplyContextValue = {
  // State
  stage: Stage;
  mode: Mode;
  rawText: string;
  contextText: string;
  targetRole: TargetRole;
  translateStyle: TranslateStyle;
  customRoleName: string;
  customRoleDraft: string;
  isCustomRoleEditing: boolean;
  panelAnimateKey: number;
  isAwake: boolean;
  hasBlockingError: boolean;
  streamedText: string;
  isStreaming: boolean;
  roleMeta: RoleOption | undefined;
  styleMeta: StyleOption | undefined;

  // Setters
  setRawText: (text: string) => void;
  setMode: (mode: Mode) => void;
  setCustomRoleDraft: (draft: string) => void;
  setContextText: (text: string) => void;
  clearError: () => void;

  // Actions
  startGenerating: (customRoleOverride?: string) => Promise<void>;
  startCustomRoleEditing: () => void;
  cancelCustomRoleEditing: () => void;
  confirmCustomRole: () => void;
  saveCustomRole: () => void;
  confirmAndCopy: () => Promise<void>;
  selectPresetRole: (role: PresetTargetRole) => void;
  selectRoleByHotkey: (hotkey: 1 | 2 | 3) => void;
  selectTranslateStyle: (style: TranslateStyle) => void;
  selectStyleByHotkey: (hotkey: 1 | 2 | 3 | 4) => void;
  terminateSession: () => Promise<void>;
};

const ZenReplyContext = createContext<ZenReplyContextValue | null>(null);

export function useZenReplyContext(): ZenReplyContextValue {
  const ctx = useContext(ZenReplyContext);
  if (!ctx) throw new Error("useZenReplyContext must be used inside <ZenReplyProvider>");
  return ctx;
}

export function ZenReplyProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToastContext();
  const { syncSettingsFromStore, setIsSettingsOpen } = useSettingsContext();

  const deps = useMemo(
    () => ({ syncSettingsFromStore, setIsSettingsOpen, showToast }),
    [syncSettingsFromStore, setIsSettingsOpen, showToast],
  );

  const flow = useZenReplyFlow(deps);

  return (
    <ZenReplyContext.Provider value={flow}>
      {children}
    </ZenReplyContext.Provider>
  );
}
