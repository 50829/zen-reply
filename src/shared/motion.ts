// ── Unified Motion Presets ────────────────────────────────────────────
// All framer-motion transition configurations live here. Components
// import these instead of inlining magic numbers.

import { FLIP_DURATION, FLIP_TIMES } from "./tokens";

// ── Transition presets ───────────────────────────────────────────────

/** Section expand/collapse (controls, result card). */
export const SECTION_TRANSITION = {
  duration: 0.24,
  ease: "easeOut" as const,
} as const;

/** Quick element fade (custom role input/button swap). */
export const FADE_TRANSITION = {
  duration: 0.15,
} as const;

/** Action button slide-in (result card confirm/cancel). */
export const SLIDE_TRANSITION = {
  duration: 0.2,
} as const;

// ── Spring presets ───────────────────────────────────────────────────

/** Gear icon rotation spring. */
export const SPRING_BUTTON = {
  type: "spring" as const,
  stiffness: 200,
  damping: 15,
} as const;

/** Toast entrance spring. */
export const SPRING_TOAST = {
  y: { type: "spring" as const, stiffness: 380, damping: 24 },
  opacity: { duration: 0.18 },
  scale: { type: "spring" as const, stiffness: 400, damping: 22 },
} as const;

// ── Flip card transitions ────────────────────────────────────────────

export const FLIP_ROTATE_TRANSITION = {
  duration: FLIP_DURATION,
  times: FLIP_TIMES,
  ease: [
    [0.32, 0, 0.67, 0],
    [0.25, 0.1, 0.25, 1],
    [0.5, 0, 0.5, 1],
    [0.25, 0.1, 0.25, 1],
    [0.33, 1, 0.68, 1],
    [0.33, 1, 0.68, 1],
    [0.33, 1, 0.68, 1],
  ] as [number, number, number, number][],
};

export const FLIP_SCALE_TRANSITION = {
  duration: FLIP_DURATION,
  times: FLIP_TIMES,
  ease: "easeInOut" as const,
} as const;

export const FLIP_SHADOW_TRANSITION = {
  duration: FLIP_DURATION,
  times: FLIP_TIMES,
  ease: "easeInOut" as const,
} as const;

export const HALO_TRANSITION = {
  duration: FLIP_DURATION,
  ease: "easeInOut" as const,
} as const;
