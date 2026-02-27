import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ToastState, ToastVariant } from "../../hooks/useToast";

type ZenToastProps = {
  toast: ToastState | null;
};

const VARIANT_STYLES: Record<
  ToastVariant,
  { border: string; bg: string; text: string; iconClass: string; glow: string }
> = {
  error: {
    border: "border-red-300/35",
    bg: "bg-red-300/15",
    text: "text-red-200",
    iconClass: "text-red-300/90",
    glow: "shadow-[0_0_28px_rgba(239,68,68,0.15)]",
  },
  success: {
    border: "border-emerald-300/35",
    bg: "bg-emerald-300/15",
    text: "text-emerald-200",
    iconClass: "text-emerald-300/90",
    glow: "shadow-[0_0_28px_rgba(52,211,153,0.12)]",
  },
  info: {
    border: "border-cyan-300/35",
    bg: "bg-cyan-300/15",
    text: "text-cyan-200",
    iconClass: "text-cyan-300/90",
    glow: "shadow-[0_0_28px_rgba(34,211,238,0.12)]",
  },
};

const ICONS: Record<ToastVariant, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export function ZenToast({ toast }: ZenToastProps) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={`zen-toast-${toast.variant}-${toast.message}`}
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
          <ToastContent toast={toast} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ToastContent({ toast }: { toast: ToastState }) {
  const style = VARIANT_STYLES[toast.variant];
  const Icon = ICONS[toast.variant];

  return (
    <div
      className={`flex max-w-[86%] items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm backdrop-blur-2xl ${style.border} ${style.bg} ${style.text} ${style.glow}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${style.iconClass}`} />
      <span className="leading-6">{toast.message}</span>
    </div>
  );
}
