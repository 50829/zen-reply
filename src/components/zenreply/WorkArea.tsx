import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultCard } from "./ResultCard";
import { RoleComposer } from "./RoleComposer";
import { SourceTextCard } from "./SourceTextCard";
import { GlassCard } from "../shared/GlassCard";
import { useZenReplyContext } from "../../contexts/ZenReplyContext";
import { useSettingsContext } from "../../contexts/SettingsContext";
import { SECTION_TRANSITION } from "../../shared/motion";
import { SPRING_BUTTON } from "../../shared/motion";

export function WorkArea() {
  const {
    stage,
    startGenerating,
    terminateSession,
    confirmAndCopy,
  } = useZenReplyContext();
  const { isSettingsOpen, openSettings } = useSettingsContext();

  const controlsVisible = stage === "INPUT";
  const resultVisible = stage === "GENERATING" || stage === "FINISHED";

  const handleOpenSettings = useCallback(() => {
    void openSettings();
  }, [openSettings]);
  const handleGenerate = useCallback(() => {
    void startGenerating();
  }, [startGenerating]);
  const handleCancel = useCallback(() => {
    void terminateSession();
  }, [terminateSession]);
  const handleConfirm = useCallback(() => {
    void confirmAndCopy();
  }, [confirmAndCopy]);

  return (
    <GlassCard accent="cyan">
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
          onClick={handleOpenSettings}
          animate={{ rotate: isSettingsOpen ? 180 : 0 }}
          transition={SPRING_BUTTON}
          className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[13px] text-zinc-200 transition-colors hover:border-cyan-300/50 hover:text-cyan-100 active:scale-[0.97]"
        >
          ⚙
        </motion.button>
      </header>

      <div className="flex-1">
        <SourceTextCard />

        <AnimatePresence initial={false}>
          {controlsVisible ? (
            <motion.section
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -12 }}
              transition={SECTION_TRANSITION}
              className="overflow-hidden"
            >
              <RoleComposer
                onGenerate={handleGenerate}
              />
            </motion.section>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {resultVisible ? (
            <ResultCard
              onCancel={handleCancel}
              onConfirmAndCopy={handleConfirm}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
