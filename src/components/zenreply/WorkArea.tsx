import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultCard } from "./ResultCard";
import { RoleComposer } from "./RoleComposer";
import { StyleComposer } from "./StyleComposer";
import { SourceTextCard } from "./SourceTextCard";
import { GlassCard } from "../shared/GlassCard";
import { useZenReplyContext } from "../../contexts/ZenReplyContext";
import { useSettingsContext } from "../../contexts/SettingsContext";
import { SECTION_TRANSITION } from "../../shared/motion";
import { SPRING_BUTTON } from "../../shared/motion";
import type { Mode } from "../../features/zenreply/types";

const MODE_TABS: { id: Mode; label: string }[] = [
  { id: "reply",     label: "💬 回复（Alt+1）" },
  { id: "translate", label: "🌐 英文（Alt+2）" },
];

export function WorkArea() {
  const {
    stage,
    mode,
    setMode,
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

      {/* Mode Tabs */}
      <div className="mb-3 flex gap-1 rounded-xl border border-white/10 bg-white/3 p-1">
        {MODE_TABS.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            title={`Alt+${i + 1}`}
            onClick={() => setMode(tab.id)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition active:scale-[0.97] ${
              mode === tab.id
                ? tab.id === "translate"
                  ? "bg-violet-300/20 text-violet-100 border border-violet-300/40"
                  : "bg-cyan-300/20 text-cyan-100 border border-cyan-300/40"
                : "text-zinc-400 hover:text-zinc-200 border border-transparent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
              <AnimatePresence mode="wait" initial={false}>
                {mode === "translate" ? (
                  <motion.div
                    key="translate"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <StyleComposer onGenerate={handleGenerate} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="reply"
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <RoleComposer onGenerate={handleGenerate} />
                  </motion.div>
                )}
              </AnimatePresence>
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
