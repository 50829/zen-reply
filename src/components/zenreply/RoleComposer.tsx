import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CUSTOM_ROLE_DEFAULT_LABEL,
  CUSTOM_ROLE_HOTKEY,
  ROLE_OPTIONS,
  type PresetTargetRole,
  type TargetRole,
} from "../../features/zenreply/types";

type RoleComposerProps = {
  targetRole: TargetRole;
  customRoleName: string;
  customRoleDraft: string;
  isCustomRoleEditing: boolean;
  contextText: string;
  roleVibe?: string;
  isStreaming: boolean;
  hasError: boolean;
  onSelectPresetRole: (role: PresetTargetRole) => void;
  onStartCustomRoleEditing: () => void;
  onCustomRoleDraftChange: (value: string) => void;
  onCancelCustomRoleEditing: () => void;
  onConfirmCustomRole: () => void;
  onContextTextChange: (value: string) => void;
  onGenerate: () => void;
};

export function RoleComposer({
  targetRole,
  customRoleName,
  customRoleDraft,
  isCustomRoleEditing,
  contextText,
  roleVibe,
  isStreaming,
  hasError,
  onSelectPresetRole,
  onStartCustomRoleEditing,
  onCustomRoleDraftChange,
  onCancelCustomRoleEditing,
  onConfirmCustomRole,
  onContextTextChange,
  onGenerate,
}: RoleComposerProps) {
  const customRoleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isCustomRoleEditing) {
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      customRoleInputRef.current?.focus();
      customRoleInputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [isCustomRoleEditing]);

  return (
    <div className="mt-4 rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-2 text-xs text-zinc-400">沟通对象</p>
      <div className="flex flex-wrap items-center gap-2">
        {ROLE_OPTIONS.map((role) => {
          const active = targetRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelectPresetRole(role.id)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                active
                  ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-100"
                  : "border-white/15 bg-white/5 text-zinc-200 hover:border-white/35"
              }`}
            >
              {role.hotkey}. {role.label}
            </button>
          );
        })}

        <motion.div layout className="min-w-[170px] max-w-full">
          <AnimatePresence initial={false} mode="wait">
            {isCustomRoleEditing ? (
              <motion.input
                key="custom-role-input"
                layout
                ref={customRoleInputRef}
                autoFocus
                value={customRoleDraft}
                onChange={(event) => onCustomRoleDraftChange(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    onConfirmCustomRole();
                    return;
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    onCancelCustomRoleEditing();
                  }
                }}
                placeholder="输入对方身份 (按 Enter 确认)"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="w-full rounded-full border border-cyan-300/50 bg-cyan-300/15 px-3 py-1.5 text-xs text-cyan-100 outline-none placeholder:text-cyan-200/65"
              />
            ) : (
              <motion.button
                key={`custom-role-button-${customRoleName || "empty"}`}
                layout
                type="button"
                onClick={onStartCustomRoleEditing}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  targetRole === "custom"
                    ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-100"
                    : "border-white/15 bg-white/5 text-zinc-200 hover:border-white/35"
                }`}
              >
                {CUSTOM_ROLE_HOTKEY}.{" "}
                {targetRole === "custom" && customRoleName
                  ? customRoleName
                  : CUSTOM_ROLE_DEFAULT_LABEL}
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        {targetRole === "custom"
          ? customRoleName
            ? `已自定义对象：${customRoleName}（会自动推断权力关系与语气边界）`
            : "可输入任何对象身份，例如：奇葩房东、催命 HR、难缠亲戚"
          : roleVibe}
      </p>

      <input
        value={contextText}
        onChange={(event) => onContextTextChange(event.currentTarget.value)}
        placeholder="对方说了什么？(可选)"
        className="mt-3 w-full rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
      />

      <button
        type="button"
        onClick={onGenerate}
        disabled={isStreaming || hasError}
        className="mt-3 w-full rounded-[14px] border border-cyan-300/45 bg-cyan-300/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-55"
      >
        ✨ 生成回复
      </button>
    </div>
  );
}
