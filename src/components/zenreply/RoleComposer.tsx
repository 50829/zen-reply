import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CUSTOM_ROLE_DEFAULT_LABEL,
  ROLE_OPTIONS,
} from "../../shared/constants";

import { useZenReplyContext } from "../../contexts/ZenReplyContext";
import { ClearableField } from "../shared/ClearableField";
import { FADE_TRANSITION } from "../../shared/motion";

type RoleComposerProps = {
  onGenerate: () => void;
};

export function RoleComposer({ onGenerate }: RoleComposerProps) {
  const {
    targetRole,
    customRoleName,
    customRoleDraft,
    isCustomRoleEditing,
    contextText,
    roleMeta,
    isStreaming,
    hasBlockingError,
    selectPresetRole,
    startCustomRoleEditing,
    setCustomRoleDraft,
    cancelCustomRoleEditing,
    confirmCustomRole,
    saveCustomRole,
    setContextText,
  } = useZenReplyContext();

  const customRoleInputRef = useRef<HTMLInputElement | null>(null);
  const measurerRef = useRef<HTMLSpanElement | null>(null);
  const [inputWidth, setInputWidth] = useState<number | undefined>(undefined);

  const PLACEHOLDER_TEXT = "输入对方身份 (按 Enter 确认)";
  const INPUT_PADDING = 30;

  const measureWidth = useCallback(() => {
    if (!measurerRef.current) return;
    setInputWidth(measurerRef.current.offsetWidth + INPUT_PADDING);
  }, []);

  useEffect(() => {
    if (isCustomRoleEditing) {
      requestAnimationFrame(measureWidth);
    }
    // customRoleDraft is intentional: it changes the hidden measurer span DOM,
    // which requires re-measuring width. The static analyzer can't see this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomRoleEditing, customRoleDraft, measureWidth]);

  useEffect(() => {
    if (!isCustomRoleEditing) return;
    const raf = window.requestAnimationFrame(() => {
      customRoleInputRef.current?.focus();
      customRoleInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [isCustomRoleEditing]);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/3 p-3">
      <p className="mb-2 text-xs text-zinc-400">沟通对象</p>
      <div className="flex flex-wrap items-center gap-2">
        {ROLE_OPTIONS.map((role) => {
          const active = targetRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => selectPresetRole(role.id)}
              className={`rounded-full border px-3 py-1.5 text-xs transition active:scale-[0.97] ${
                active
                  ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-100"
                  : "border-white/15 bg-white/5 text-zinc-200 hover:border-white/35"
              }`}
            >
              {role.hotkey}. {role.label}
            </button>
          );
        })}

        {/* Hidden measurer span */}
        <span
          ref={measurerRef}
          aria-hidden
          className="pointer-events-none invisible fixed left-0 top-0 whitespace-pre text-xs"
        >
          {isCustomRoleEditing ? (customRoleDraft || PLACEHOLDER_TEXT) : ""}
        </span>

        <div
          className="max-w-full shrink-0 transition-[width] duration-150 ease-out"
          style={
            isCustomRoleEditing && inputWidth
              ? { width: inputWidth }
              : undefined
          }
        >
          <AnimatePresence initial={false} mode="wait">
            {isCustomRoleEditing ? (
              <motion.input
                key="custom-role-input"
                ref={customRoleInputRef}
                autoFocus
                value={customRoleDraft}
                onChange={(e) => setCustomRoleDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                    confirmCustomRole();
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    cancelCustomRoleEditing();
                  }
                }}
                onBlur={() => {
                  if (!customRoleDraft.trim()) {
                    cancelCustomRoleEditing();
                  } else {
                    saveCustomRole();
                  }
                }}
                placeholder={PLACEHOLDER_TEXT}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={FADE_TRANSITION}
                className="w-full rounded-full border border-cyan-300/50 bg-cyan-300/15 px-3 py-1.5 text-xs text-cyan-100 outline-none placeholder:text-cyan-200/65"
              />
            ) : (
              <motion.button
                key={`custom-role-button-${customRoleName || "empty"}`}
                type="button"
                onClick={startCustomRoleEditing}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={FADE_TRANSITION}
                className={`whitespace-nowrap rounded-full border text-xs transition active:scale-[0.97] ${
                  targetRole === "custom" && customRoleName
                    ? "px-3 py-1.5 border-cyan-300/60 bg-cyan-300/20 text-cyan-100"
                    : targetRole === "custom"
                      ? "px-2.5 py-1.5 border-cyan-300/60 bg-cyan-300/20 text-cyan-100"
                      : "px-2.5 py-1.5 border-white/15 bg-white/5 text-zinc-200 hover:border-white/35"
                }`}
                title="自定义对象身份"
              >
                {targetRole === "custom" && customRoleName
                  ? `✦ ${customRoleName}`
                  : CUSTOM_ROLE_DEFAULT_LABEL}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        {targetRole === "custom"
          ? customRoleName
            ? `已自定义对象：${customRoleName}（会自动推断权力关系与语气边界）`
            : "可输入任何对象身份，例如：奇葩房东、催命 HR、难缠亲戚"
          : roleMeta?.vibe}
      </p>

      <ClearableField
        value={contextText}
        onChange={setContextText}
        placeholder="对方说了什么？(可选)"
        accent="cyan"
        className="mt-3"
      />

      <button
        type="button"
        onClick={onGenerate}
        disabled={isStreaming || hasBlockingError}
        className="mt-3 w-full rounded-[14px] border border-cyan-300/45 bg-cyan-300/15 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/25 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
      >
        ✨ 生成回复
      </button>
    </div>
  );
}
