import { X } from "lucide-react";
import type { AppSettings } from "../../features/settings/store";
import { useDragWindow } from "../../hooks/useDragWindow";

type SettingsPanelProps = {
  settingsDraft: AppSettings;
  isSettingsBusy: boolean;
  onFlipBack: () => void;
  onFieldChange: (key: keyof AppSettings, value: string) => void;
  onSave: () => void;
  onTestApi: () => void;
};

export function SettingsPanel({
  settingsDraft,
  isSettingsBusy,
  onFlipBack,
  onFieldChange,
  onSave,
  onTestApi,
}: SettingsPanelProps) {
  const onDragMouseDown = useDragWindow();

  return (
    <div role="application" onMouseDown={onDragMouseDown} className="rounded-[24px] border border-violet-300/20 bg-violet-500/[0.04] p-[2px] shadow-[0_1px_6px_rgba(139,92,246,0.04)]">
      <main className="relative flex w-full flex-col overflow-hidden rounded-[21px] border border-white/10 bg-[#0d1117]/90 p-5 text-zinc-100 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.04),0_3px_11px_rgba(0,0,0,0.45),0_0_6px_rgba(139,92,246,0.04)]">
        {/* Header */}
        <header className="mb-4 flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-violet-300 bg-clip-text text-transparent">
                设置
              </span>
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              设置保存在本地，Ctrl/Cmd + S 保存设置，Esc 返回
            </p>
          </div>
          <button
            type="button"
            onClick={onFlipBack}
            className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-xs text-violet-200 transition hover:border-violet-300/45 hover:bg-violet-300/20 active:scale-95"
          >
            ↩ 
          </button>
        </header>

        {/* Form */}
        <div className="space-y-3.5">
          <ClearableField
            label="API Key"
            type="password"
            value={settingsDraft.api_key}
            placeholder="例如：sk-abcdefg..."
            onChange={(v) => onFieldChange("api_key", v)}
          />
          <ClearableField
            label="API Base URL"
            type="text"
            value={settingsDraft.api_base}
            placeholder="例如：https://api.siliconflow.cn/v1"
            onChange={(v) => onFieldChange("api_base", v)}
          />
          <ClearableField
            label="模型名称"
            type="text"
            value={settingsDraft.model_name}
            placeholder="例如：Pro/MiniMaxAI/MiniMax-M2.5"
            onChange={(v) => onFieldChange("model_name", v)}
          />
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={onTestApi}
            disabled={isSettingsBusy}
            className="rounded-[12px] border border-violet-300/45 bg-violet-300/15 px-4 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-300/25 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            测试连接
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSettingsBusy}
            className="rounded-[12px] border border-emerald-300/45 bg-emerald-300/15 px-4 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/25 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            保存设置
          </button>
        </div>

        {/* Bottom gradient accent */}
        <div className="pointer-events-none absolute -bottom-px left-1/2 h-[1px] w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-400/25 to-transparent" />
      </main>
    </div>
  );
}

// ── Clearable input field ──

type ClearableFieldProps = {
  label: string;
  type: "text" | "password";
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

function ClearableField({ label, type, value, placeholder, onChange }: ClearableFieldProps) {
  return (
    <fieldset>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          className="w-full rounded-[12px] border border-white/10 bg-white/[0.03] px-3 pr-8 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 transition focus:border-violet-300/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]"
        />
        {value ? (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-zinc-500 transition hover:text-zinc-300"
            aria-label={`清除${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
