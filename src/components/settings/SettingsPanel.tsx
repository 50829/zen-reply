import { useCallback } from "react";
import { X } from "lucide-react";
import { GlassCard } from "../shared/GlassCard";
import { useSettingsContext } from "../../contexts/SettingsContext";

export function SettingsPanel() {
  const {
    settingsDraft,
    isSettingsBusy,
    closeSettings,
    onFieldChange,
    saveSettings,
    testApiConnection,
  } = useSettingsContext();

  const handleSave = useCallback(() => { void saveSettings(); }, [saveSettings]);
  const handleTest = useCallback(() => { void testApiConnection(); }, [testApiConnection]);

  return (
    <GlassCard accent="violet">
      {/* Header */}
      <header className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            <span className="bg-linear-to-r from-violet-200 via-fuchsia-200 to-violet-300 bg-clip-text text-transparent">
              设置
            </span>
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            设置保存在本地，Ctrl/Cmd + S 保存设置，Esc 返回
          </p>
        </div>
        <button
          type="button"
          onClick={closeSettings}
          className="rounded-full border border-violet-300/25 bg-violet-300/10 px-3 py-1.5 text-xs text-violet-200 transition hover:border-violet-300/45 hover:bg-violet-300/20 active:scale-[0.97]"
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
          onClick={handleTest}
          disabled={isSettingsBusy}
          className="rounded-xl border border-violet-300/45 bg-violet-300/15 px-4 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-300/25 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
        >
          测试连接
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSettingsBusy}
          className="rounded-xl border border-emerald-300/45 bg-emerald-300/15 px-4 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-300/25 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
        >
          保存设置
        </button>
      </div>

      {/* Bottom gradient accent */}
      <div className="pointer-events-none absolute -bottom-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-linear-to-r from-transparent via-violet-400/25 to-transparent" />
    </GlassCard>
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
  const inputId = `settings-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <fieldset>
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-medium text-zinc-400">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-white/10 bg-white/3 px-3 pr-8 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 transition focus:border-violet-300/50 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]"
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
