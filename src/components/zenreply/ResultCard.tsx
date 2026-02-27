import { AnimatePresence, motion } from "framer-motion";
import type { Stage } from "../../features/zenreply/types";

type ResultCardProps = {
  stage: Stage;
  streamedText: string;
  isStreaming: boolean;
  onCancel: () => void;
  onConfirmAndCopy: () => void;
};

export function ResultCard({
  stage,
  streamedText,
  isStreaming,
  onCancel,
  onConfirmAndCopy,
}: ResultCardProps) {
  return (
    <motion.section
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="mt-4 overflow-hidden"
    >
      <div className="rounded-[16px] border border-white/10 bg-white/[0.03] p-3">
        <p className="mb-2 text-xs text-zinc-400">结果展示区</p>
        <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-100">
          {streamedText}
          {isStreaming && <span className="zen-cursor ml-1">▌</span>}
        </p>

        <AnimatePresence>
          {stage === "FINISHED" && (
            <motion.div
              initial={{ opacity: 0, x: 16, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 12, y: 4 }}
              transition={{ duration: 0.2 }}
              className="mt-4 flex items-center justify-end gap-2"
            >
              <button
                type="button"
                onClick={onCancel}
                className="rounded-[12px] border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-white/30"
              >
                Esc 退出程序
              </button>
              <button
                type="button"
                onClick={onConfirmAndCopy}
                className="rounded-[12px] border border-emerald-300/50 bg-emerald-300/20 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-300/30"
              >
                ↵ 确认并复制
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
