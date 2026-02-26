import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

type ErrorToastProps = {
  message: string | null;
};

export function ErrorToast({ message }: ErrorToastProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          key="error-toast"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{
            y: { type: "spring", stiffness: 300 },
            opacity: { duration: 0.2 },
            scale: { duration: 0.2 },
          }}
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
        >
          <div className="flex max-w-[86%] items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-200 backdrop-blur-2xl shadow-[0_0_28px_rgba(239,68,68,0.15)]">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-300/90" />
            <span className="leading-6">{message}</span>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
