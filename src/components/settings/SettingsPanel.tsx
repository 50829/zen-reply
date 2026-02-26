import type { AppSettings } from "../../features/settings/store";

type SettingsPanelProps = {
  settingsDraft: AppSettings;
  settingsFeedback: string;
  isSettingsBusy: boolean;
  onFlipBack: () => void;
  onFieldChange: (key: keyof AppSettings, value: string) => void;
  onSave: () => void;
  onTestApi: () => void;
};

export function SettingsPanel({
  settingsDraft,
  settingsFeedback,
  isSettingsBusy,
  onFlipBack,
  onFieldChange,
  onSave,
  onTestApi,
}: SettingsPanelProps) {
  return (
    <div className="rounded-[24px] border border-violet-300/20 bg-violet-500/[0.04] p-[2px] shadow-[0_20px_70px_rgba(139,92,246,0.08)]">
      <main className="relative flex w-full flex-col overflow-hidden rounded-[21px] border border-white/[0.08] bg-[#0d1117]/94 p-5 text-zinc-100 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(255,255,255,0.03),0_20px_80px_rgba(0,0,0,0.78),0_0_32px_rgba(139,92,246,0.10)]">
        {/* Header */}
        <header className="mb-5 flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-violet-300 bg-clip-text text-transparent">
                设置
              </span>
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              API 密钥保存在本地，不会上传到任何服务器
            </p>
          </div>
          <button
            type="button"
            onClick={onFlipBack}
            className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-xs text-violet-200 transition hover:border-violet-300/45 hover:bg-violet-300/20 active:scale-95"
          >
            ↩ 返回
          </button>
        </header>

        {/* Form */}
        <div className="space-y-3.5">
          <fieldset>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              API Key
            </label>
            <input
              type="password"
              value={settingsDraft.api_key}
              onChange={(e) => onFieldChange("api_key", e.currentTarget.value)}
              placeholder="sk-..."
              className="w-full rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-violet-300/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]"
            />
          </fieldset>

          <fieldset>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              API Base URL
            </label>
            <input
              type="text"
              value={settingsDraft.api_base}
              onChange={(e) => onFieldChange("api_base", e.currentTarget.value)}
              placeholder="https://api.siliconflow.cn/v1"
              className="w-full rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-violet-300/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]"
            />
          </fieldset>

          <fieldset>
            <label className="mb-1.5 block text-xs font-medium text-zinc-400">
              模型名称
            </label>
            <input
              type="text"
              value={settingsDraft.model_name}
              onChange={(e) => onFieldChange("model_name", e.currentTarget.value)}
              placeholder="Pro/MiniMaxAI/MiniMax-M2.5"
              className="w-full rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-violet-300/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]"
            />
          </fieldset>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={isSettingsBusy}
            className="rounded-[12px] border border-violet-300/40 bg-violet-300/15 px-4 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-300/25 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            保存设置
          </button>
          <button
            type="button"
            onClick={onTestApi}
            disabled={isSettingsBusy}
            className="rounded-[12px] border border-emerald-300/35 bg-emerald-300/10 px-4 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/20 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            测试连接
          </button>
        </div>

        {/* Feedback */}
        <div className="mt-3 flex min-h-[28px] items-center">
          <p
            className={`text-xs transition-colors ${
              settingsFeedback.startsWith("✅")
                ? "text-emerald-300"
                : settingsFeedback.startsWith("❌")
                  ? "text-rose-300"
                  : settingsFeedback === "测试中..."
                    ? "text-amber-300/80"
                    : "text-zinc-500"
            }`}
          >
            {settingsFeedback || "Ctrl/Cmd + , 切换面板  ·  Esc 关闭"}
          </p>
        </div>

        {/* Bottom gradient accent */}
        <div className="pointer-events-none absolute -bottom-px left-1/2 h-[1px] w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-400/25 to-transparent" />
      </main>
    </div>
  );
}
