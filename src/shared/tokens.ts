// ── Design Tokens ─────────────────────────────────────────────────────
// Single source of truth for all visual constants. Import from here
// instead of hardcoding values in components.

// ── Layout ───────────────────────────────────────────────────────────

export const WINDOW_FIXED_WIDTH = 600;
export const WINDOW_MAX_HEIGHT = 980;
export const WINDOW_VERTICAL_PADDING = 40;

export const CARD_RADIUS_OUTER = 24;
export const CARD_RADIUS_INNER = 21;
export const BUTTON_RADIUS = 12;
export const SECTION_RADIUS = 16;

// ── Shadows ──────────────────────────────────────────────────────────
// Precomposed multi-layer box-shadows for the glass card.

export const CARD_SHADOW_CYAN = [
  "inset 0 1px 0 rgba(255,255,255,0.10)",
  "inset 0 -1px 0 rgba(255,255,255,0.04)",
  "0 3px 11px rgba(0,0,0,0.45)",
  "0 0 6px rgba(34,211,238,0.06)",
].join(", ");

export const CARD_SHADOW_VIOLET = [
  "inset 0 1px 0 rgba(255,255,255,0.10)",
  "inset 0 -1px 0 rgba(255,255,255,0.04)",
  "0 3px 11px rgba(0,0,0,0.45)",
  "0 0 6px rgba(139,92,246,0.04)",
].join(", ");

export const OUTER_GLOW_CYAN = "0 1px 6px rgba(255,255,255,0.04)";
export const OUTER_GLOW_VIOLET = "0 1px 6px rgba(139,92,246,0.04)";

// ── Flip Animation ───────────────────────────────────────────────────

export const FLIP_DURATION = 0.72; // seconds
export const FLIP_TIMES = [0, 0.11, 0.39, 0.44, 0.72, 0.80, 0.90, 1.0];

export const FORWARD_ROTATE = [0, -3, 90, 90, 180, 183, 179, 180];
export const BACKWARD_ROTATE = [180, 183, 90, 90, 0, -3, 2, 0];

export const FLIP_SCALE = [1, 1, 0.97, 0.97, 1, 1.008, 0.998, 1];

export const FLIP_SHADOW = [
  "0 4px 12px rgba(0,0,0,0.18)",
  "0 4px 11px rgba(0,0,0,0.28)",
  "0 4px 14px rgba(0,0,0,0.35)",
  "0 4px 14px rgba(0,0,0,0.35)",
  "0 4px 12px rgba(0,0,0,0.18)",
  "0 3px 9px rgba(0,0,0,0.16)",
  "0 4px 12px rgba(0,0,0,0.20)",
  "0 4px 12px rgba(0,0,0,0.18)",
];

export const FLIP_STATIC_SHADOW = "0 4px 12px rgba(0,0,0,0.18)";

/** Extra px added during flip so 3D rotation isn't clipped. */
export const FLIP_WINDOW_EXTRA = 64;

// ── Halo Sweep ───────────────────────────────────────────────────────

export const HALO_OPACITY_TIMES = [0, 0.35, 0.50, 1.0];
export const HALO_OPACITY_VALUES = [0, 0.20, 0.15, 0];
