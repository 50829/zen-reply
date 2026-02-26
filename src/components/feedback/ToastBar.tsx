import { AnimatePresence, motion } from "framer-motion";

type ToastBarProps = {
  message: string;
};

export function ToastBar({ message }: ToastBarProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={`pointer-events-none absolute bottom-4 rounded-[12px] border px-4 py-2 text-xs ${
            message.startsWith("✅")
              ? "border-emerald-300/45 bg-emerald-300/20 text-emerald-100"
              : "border-rose-300/40 bg-rose-300/20 text-rose-100"
          }`}
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
