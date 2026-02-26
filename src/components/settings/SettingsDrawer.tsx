import { AnimatePresence, motion } from "framer-motion";
import type { AppSettings } from "../../features/settings/store";

type SettingsDrawerProps = {
  isOpen: boolean;
  settingsDraft: AppSettings;
  settingsFeedback: string;
  isSettingsBusy: boolean;
  onClose: () => void;
  onFieldChange: (key: keyof AppSettings, value: string) => void;
  onSave: () => void;
  onTestApi: () => void;
};

export function SettingsDrawer({
  isOpen,
  settingsDraft,
  settingsFeedback,
  isSettingsBusy,
  onClose,
  onFieldChange,
  onSave,
  onTestApi,
}: SettingsDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭设置"
            className="absolute inset-0 z-20 cursor-default bg-black/45 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                onClick={onClose}
                className="rounded-md border border-white/15 px-2 py-1 text-xs text-zinc-300 transition hover:border-white/35"
              >
                关闭
              </button>
            </div>

            <label className="mb-2 text-xs text-zinc-300">api_key</label>
            <input
              type="password"
              value={settingsDraft.api_key}
              onChange={(event) => onFieldChange("api_key", event.currentTarget.value)}
              placeholder="输入 API Key"
              className="mb-3 w-full rounded-[12px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
            />

            <label className="mb-2 text-xs text-zinc-300">api_base</label>
            <input
              type="text"
              value={settingsDraft.api_base}
              onChange={(event) => onFieldChange("api_base", event.currentTarget.value)}
              placeholder="https://api.siliconflow.cn/v1"
              className="mb-3 w-full rounded-[12px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
            />

            <label className="mb-2 text-xs text-zinc-300">model_name</label>
            <input
              type="text"
              value={settingsDraft.model_name}
              onChange={(event) => onFieldChange("model_name", event.currentTarget.value)}
              placeholder="Pro/MiniMaxAI/MiniMax-M2.5"
              className="w-full rounded-[12px] border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
            />

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={isSettingsBusy}
                className="rounded-[10px] border border-cyan-300/45 bg-cyan-300/15 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                保存设置
              </button>
              <button
                type="button"
                onClick={onTestApi}
                disabled={isSettingsBusy}
                className="rounded-[10px] border border-emerald-300/45 bg-emerald-300/15 px-3 py-2 text-xs font-medium text-emerald-100 transition hover:bg-emerald-300/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                测试 API
              </button>
            </div>

            <p className="mt-3 min-h-5 text-xs text-zinc-300">
              {settingsFeedback || "提示：保存后会持久化到本地，发起请求时会自动读取。"}
            </p>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
