import { AnimatePresence, motion } from "framer-motion";
import { ResultCard } from "../zenreply/ResultCard";
import { RoleComposer } from "../zenreply/RoleComposer";
import { SourceTextCard } from "../zenreply/SourceTextCard";
import type { PresetTargetRole, Stage, TargetRole, RoleOption } from "../../features/zenreply/types";

type WorkAreaProps = {
  stage: Stage;
  rawText: string;
  targetRole: TargetRole;
  customRoleName: string;
  customRoleDraft: string;
  isCustomRoleEditing: boolean;
  contextText: string;
  roleMeta: RoleOption | undefined;
  streamedText: string;
  isStreaming: boolean;
  isSettingsOpen: boolean;
  hasBlockingError: boolean;
  onRawTextChange: (text: string) => void;
  onSelectPresetRole: (role: PresetTargetRole) => void;
  onStartCustomRoleEditing: () => void;
  onCustomRoleDraftChange: (draft: string) => void;
  onCancelCustomRoleEditing: () => void;
  onConfirmCustomRole: () => void;
  onContextTextChange: (text: string) => void;
  onGenerate: () => void;
  onOpenSettings: () => void;
  onCancel: () => void;
  onConfirmAndCopy: () => void;
};

export function WorkArea({
  stage,
  rawText,
  targetRole,
  customRoleName,
  customRoleDraft,
  isCustomRoleEditing,
  contextText,
  roleMeta,
  streamedText,
  isStreaming,
  isSettingsOpen,
  hasBlockingError,
  onRawTextChange,
  onSelectPresetRole,
  onStartCustomRoleEditing,
  onCustomRoleDraftChange,
  onCancelCustomRoleEditing,
  onConfirmCustomRole,
  onContextTextChange,
  onGenerate,
  onOpenSettings,
  onCancel,
  onConfirmAndCopy,
}: WorkAreaProps) {
  const controlsVisible = stage === "INPUT";
  const resultVisible = stage === "GENERATING" || stage === "FINISHED";

  return (
    <div className="rounded-[24px] border border-white/30 bg-white/[0.08] p-[2px] shadow-[0_20px_70px_rgba(255,255,255,0.12)]">
      <main className="relative flex w-full flex-col overflow-hidden rounded-[21px] border border-white/10 bg-[#0d1117]/90 p-5 text-zinc-100 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.10),inset_0_-1px_0_rgba(255,255,255,0.04),0_20px_80px_rgba(0,0,0,0.78),0_0_32px_rgba(34,211,238,0.15)]">
        <header className="mb-4 flex shrink-0 items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">ZenReply</h1>
            <p className="mt-1 text-xs text-zinc-400">
              Alt+Space 唤醒，Enter 生成/确认，Esc 取消，Ctrl/Cmd + , 设置
            </p>
          </div>
          <motion.button
            type="button"
            title="打开设置 (Ctrl/Cmd + ,)"
            aria-label="打开设置"
            onClick={onOpenSettings}
            animate={{ rotate: isSettingsOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[13px] text-zinc-200 transition-colors hover:border-cyan-300/50 hover:text-cyan-100 active:scale-[0.97]"
          >
            ⚙
          </motion.button>
        </header>

        <div className="flex-1">
          <SourceTextCard
            stage={stage}
            rawText={rawText}
            onRawTextChange={onRawTextChange}
          />

          <AnimatePresence initial={false}>
            {controlsVisible ? (
              <motion.section
                initial={{ height: 0, opacity: 0, y: -10 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -12 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <RoleComposer
                  targetRole={targetRole}
                  customRoleName={customRoleName}
                  customRoleDraft={customRoleDraft}
                  isCustomRoleEditing={isCustomRoleEditing}
                  contextText={contextText}
                  roleVibe={roleMeta?.vibe}
                  isStreaming={isStreaming}
                  hasError={hasBlockingError}
                  onSelectPresetRole={onSelectPresetRole}
                  onStartCustomRoleEditing={onStartCustomRoleEditing}
                  onCustomRoleDraftChange={onCustomRoleDraftChange}
                  onCancelCustomRoleEditing={onCancelCustomRoleEditing}
                  onConfirmCustomRole={onConfirmCustomRole}
                  onContextTextChange={onContextTextChange}
                  onGenerate={onGenerate}
                />
              </motion.section>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {resultVisible ? (
              <ResultCard
                stage={stage}
                streamedText={streamedText}
                isStreaming={isStreaming}
                onCancel={onCancel}
                onConfirmAndCopy={onConfirmAndCopy}
              />
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
