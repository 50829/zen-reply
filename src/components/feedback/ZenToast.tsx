import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useToastContext } from "../../contexts/ToastContext";
import type { ToastState, ToastVariant } from "../../hooks/useToast";
import { SPRING_TOAST } from "../../shared/motion";

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

export function ZenToast() {
  const { toast } = useToastContext();

  return (
    <AnimatePresence>
      {toast ? (
        <div className="zen-toast-anchor pointer-events-none fixed inset-x-0 z-9999 flex justify-center">
          <motion.div
            key={`zen-toast-${toast.variant}-${toast.message}`}
            initial={{ y: 10, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.95 }}
            transition={SPRING_TOAST}
          >
            <ToastContent toast={toast} />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

function ToastContent({ toast }: { toast: ToastState }) {
  const style = VARIANT_STYLES[toast.variant];
  const Icon = ICONS[toast.variant];

  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm whitespace-nowrap backdrop-blur-2xl ${style.border} ${style.bg} ${style.text} ${style.glow}`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${style.iconClass}`} />
      <span className="leading-6">{toast.message}</span>
    </div>
  );
}
