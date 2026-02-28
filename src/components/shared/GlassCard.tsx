import type { ReactNode, MouseEvent } from "react";
import {
  CARD_SHADOW_CYAN,
  CARD_SHADOW_VIOLET,
  OUTER_GLOW_CYAN,
  OUTER_GLOW_VIOLET,
} from "../../shared/tokens";
import { useDragWindow } from "../../hooks/useDragWindow";

type Accent = "cyan" | "violet";

type GlassCardProps = {
  accent?: Accent;
  children: ReactNode;
};

const OUTER_BORDER: Record<Accent, string> = {
  cyan: "border-white/30",
  violet: "border-violet-300/20",
};

const OUTER_BG: Record<Accent, string> = {
  cyan: "bg-white/[0.08]",
  violet: "bg-violet-500/4",
};

const OUTER_GLOW: Record<Accent, string> = {
  cyan: OUTER_GLOW_CYAN,
  violet: OUTER_GLOW_VIOLET,
};

const INNER_SHADOW: Record<Accent, string> = {
  cyan: CARD_SHADOW_CYAN,
  violet: CARD_SHADOW_VIOLET,
};

/**
 * Double-layered frosted glass card used as the shell for both the main
 * WorkArea (cyan accent) and the SettingsPanel (violet accent).
 *
 * The outer layer provides a subtle glow border, the inner layer holds
 * the actual content with backdrop blur.
 */
export function GlassCard({ accent = "cyan", children }: GlassCardProps) {
  const onDragMouseDown = useDragWindow();

  return (
    <div
      role="application"
      onMouseDown={onDragMouseDown as unknown as (e: MouseEvent) => void}
      className={`flex h-full flex-col rounded-3xl border p-0.5 ${OUTER_BORDER[accent]} ${OUTER_BG[accent]}`}
      style={{ boxShadow: OUTER_GLOW[accent] }}
    >
      <main
        className="relative flex grow w-full flex-col overflow-hidden rounded-[21px] border border-white/10 bg-[#0d1117]/90 p-5 text-zinc-100 backdrop-blur-2xl"
        style={{ boxShadow: INNER_SHADOW[accent] }}
      >
        {children}
      </main>
    </div>
  );
}
