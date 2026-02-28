import { type ReactNode, type RefObject, useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type FlipCardProps = {
  isFlipped: boolean;
  front: ReactNode;
  back: ReactNode;
  panelRef: RefObject<HTMLElement | null>;
  panelAnimateKey: number;
  panelWidthClass: string;
  minHeight: number;
  /** Reports the measured content height so the window can be resized to
   *  exactly fit the content. */
  onContentHeightChange?: (height: number) => void;
};

/* ── Flip keyframes (forward: 0°→180°, backward: 180°→0°) ──────────── */

const FLIP_DURATION = 0.72; // seconds
const FLIP_TIMES = [0, 0.11, 0.39, 0.44, 0.72, 0.80, 0.90, 1.0];

const FORWARD_ROTATE = [0, -3, 90, 90, 180, 183, 179, 180];
const BACKWARD_ROTATE = [180, 183, 90, 90, 0, -3, 2, 0];

const FLIP_SCALE = [1, 1, 0.97, 0.97, 1, 1.008, 0.998, 1];

const FLIP_SHADOW = [
  "0 4px 12px rgba(0,0,0,0.18)",
  "0 4px 11px rgba(0,0,0,0.28)",
  "0 4px 14px rgba(0,0,0,0.35)",
  "0 4px 14px rgba(0,0,0,0.35)",
  "0 4px 12px rgba(0,0,0,0.18)",
  "0 3px 9px rgba(0,0,0,0.16)",
  "0 4px 12px rgba(0,0,0,0.20)",
  "0 4px 12px rgba(0,0,0,0.18)",
];

const FLIP_ROTATE_TRANSITION = {
  duration: FLIP_DURATION,
  times: FLIP_TIMES,
  ease: [
    [0.32, 0, 0.67, 0] as const,   // Phase 1: ease-in  (蓄力)
    [0.25, 0.1, 0.25, 1] as const, // Phase 2: ease-out (加速翻转)
    [0.5, 0, 0.5, 1] as const,     // Phase 3: linear   (暂停)
    [0.25, 0.1, 0.25, 1] as const, // Phase 4: ease-out (完成翻转)
    [0.33, 1, 0.68, 1] as const,   // Phase 5a: ease-out(余震)
    [0.33, 1, 0.68, 1] as const,   // Phase 5b
    [0.33, 1, 0.68, 1] as const,   // Phase 5c: settle
  ],
};

const HALO_OPACITY_TIMES = [0, 0.30, 0.44, 0.70, 1.0];
const HALO_OPACITY_VALUES = [0, 0.15, 0.25, 0.10, 0];

/* ── Height settle duration ────────────────────────────────────────── */
const HEIGHT_SETTLE_DELAY_MS = 50;
/** Extra window pixels added during flip so the 3D rotation + enlarged
 *  shadows are never clipped by the WebView boundary. Removed once the
 *  card height animation finishes. */
const FLIP_WINDOW_EXTRA = 32;
/** Smooth height transition used for BOTH pre-expand and post-contract.
 *  ~400ms ease-out blends naturally with the 720ms flip. The pre-expand
 *  reaches max around the time the card hits 90°, and the post-contract
 *  starts after the aftershock settles. No more `duration:0` hard jumps. */
const HEIGHT_TRANSITION = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as const,
};

export function FlipCard({
  isFlipped,
  front,
  back,
  panelRef,
  panelAnimateKey,
  panelWidthClass,
  minHeight,
  onContentHeightChange,
}: FlipCardProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  /** Timer handle for the delayed window-shrink after flip settles. */
  const shrinkTimerRef = useRef<number>(0);

  // ── Height management: "Flip → Settle → Resize" strategy ──────────

  const [targetHeight, setTargetHeight] = useState(minHeight);
  const [isFlipAnimating, setIsFlipAnimating] = useState(false);
  /** Synchronous mirror of `isFlipAnimating` — set inside useLayoutEffect
   *  so ResizeObserver callbacks can read it without waiting for React's
   *  batched state commit. Prevents the observer from shrinking the window
   *  during the first frames of a flip. */
  const isFlipAnimatingRef = useRef(false);
  const prevFlippedRef = useRef(isFlipped);
  /** Has the user triggered a flip at least once in the current session?
   *  Used to suppress framer-motion keyframe playback on first mount. */
  const hasEverFlipped = useRef(false);
  /** Tracks whether a flip has been triggered at least once, so the halo
   *  animation does not fire on initial mount. */
  const flipCountRef = useRef(0);
  const [flipTrigger, setFlipTrigger] = useState(0);

  // ── Reset on new session (panelAnimateKey change → section remount) ──
  const prevPanelKeyRef = useRef(panelAnimateKey);
  if (prevPanelKeyRef.current !== panelAnimateKey) {
    prevPanelKeyRef.current = panelAnimateKey;
    hasEverFlipped.current = false;
    prevFlippedRef.current = isFlipped;
    flipCountRef.current = 0;
    isFlipAnimatingRef.current = false;
  }

  // On flip trigger: lock height to max and start animating
  useLayoutEffect(() => {
    if (isFlipped !== prevFlippedRef.current) {
      prevFlippedRef.current = isFlipped;
      flipCountRef.current += 1;
      hasEverFlipped.current = true;
      isFlipAnimatingRef.current = true;
      setIsFlipAnimating(true);
      setFlipTrigger((n) => n + 1);

      // Cancel any pending window-shrink from a previous flip
      window.clearTimeout(shrinkTimerRef.current);

      // Phase A: immediately lock to max height + expand window for rotation
      const fh = frontRef.current?.offsetHeight ?? 0;
      const bh = backRef.current?.offsetHeight ?? 0;
      const maxH = Math.max(fh, bh);
      if (maxH > 0) {
        setTargetHeight(maxH);
        onContentHeightChange?.(maxH + FLIP_WINDOW_EXTRA);
      }
    }
  }, [isFlipped, onContentHeightChange]);

  // Also observe face resizes when NOT flip-animating (e.g. content changes)
  useLayoutEffect(() => {
    if (isFlipAnimating) return;

    const measure = () => {
      // Synchronous guard: if a flip just started but React's batched
      // state hasn't committed yet, bail out to preserve expanded height.
      if (isFlipAnimatingRef.current) return;

      const h = isFlipped
        ? (backRef.current?.offsetHeight ?? 0)
        : (frontRef.current?.offsetHeight ?? 0);
      if (h > 0) {
        setTargetHeight(h);
        onContentHeightChange?.(h);
      }
    };
    measure();

    const observer = new ResizeObserver(measure);
    if (frontRef.current) observer.observe(frontRef.current);
    if (backRef.current) observer.observe(backRef.current);
    return () => observer.disconnect();
  }, [isFlipped, isFlipAnimating, onContentHeightChange]);

  // Phase C: after flip animation completes, settle to exact target height.
  // The window stays expanded while the card height animates down, then
  // shrinks to fit once that transition finishes — no bottom clipping.
  const handleFlipComplete = useCallback(() => {
    const settleTimer = window.setTimeout(() => {
      // Keep isFlipAnimating true so the idle ResizeObserver stays
      // suppressed while the height transition is in flight.
      requestAnimationFrame(() => {
        const exactH = isFlipped
          ? (backRef.current?.offsetHeight ?? 0)
          : (frontRef.current?.offsetHeight ?? 0);
        if (exactH > 0) {
          setTargetHeight(exactH);
          // Delay window shrink until the card height animation completes
          shrinkTimerRef.current = window.setTimeout(() => {
            onContentHeightChange?.(exactH);
            isFlipAnimatingRef.current = false;
            setIsFlipAnimating(false);
          }, HEIGHT_TRANSITION.duration * 1000 + 50);
        } else {
          isFlipAnimatingRef.current = false;
          setIsFlipAnimating(false);
        }
      });
    }, HEIGHT_SETTLE_DELAY_MS);
    return () => window.clearTimeout(settleTimer);
  }, [isFlipped, onContentHeightChange]);

  // ── Build animation values ────────────────────────────────────────

  // On first mount (before any user-triggered flip), use static values
  // so framer-motion doesn't play the keyframe array as an animation.
  const rotateKeyframes = isFlipped ? FORWARD_ROTATE : BACKWARD_ROTATE;
  const animateRotateY = hasEverFlipped.current ? rotateKeyframes : (isFlipped ? 180 : 0);
  const animateScale = hasEverFlipped.current ? FLIP_SCALE : 1;
  const animateShadow = hasEverFlipped.current
    ? FLIP_SHADOW
    : "0 4px 12px rgba(0,0,0,0.18)";

  return (
    <div
      data-tauri-drag-region
      className="relative flex min-h-full w-full items-center justify-center px-4 pt-4 pb-8"
      style={{ perspective: 1200 }}
    >
      <motion.section
        key={panelAnimateKey}
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d" }}
        className={`transition-[max-width,width] duration-300 ${panelWidthClass}`}
      >
        {/* ── 3D Flip Container ── */}
        <motion.div
          className="relative w-full rounded-3xl"
          style={{ transformStyle: "preserve-3d", willChange: "transform" }}
          initial={false}
          animate={{
            rotateY: animateRotateY,
            scale: animateScale,
            boxShadow: animateShadow,
            height: targetHeight,
          }}
          transition={{
            rotateY: FLIP_ROTATE_TRANSITION,
            scale: { duration: FLIP_DURATION, times: FLIP_TIMES, ease: "easeInOut" },
            boxShadow: { duration: FLIP_DURATION, times: FLIP_TIMES, ease: "easeInOut" },
            height: HEIGHT_TRANSITION, // always smooth — no hard jumps
          }}
          onAnimationComplete={handleFlipComplete}
        >
          {/* Front face — backface-visibility:hidden handles visibility during 3D rotation,
               no opacity crossfade needed (avoids the "both faces invisible" white flash) */}
          <div
            ref={frontRef}
            className="zen-flip-face absolute inset-x-0 top-0 w-full"
            style={{ pointerEvents: isFlipped ? "none" : "auto" }}
          >
            {front}
          </div>

          {/* Back face */}
          <div
            ref={backRef}
            className="zen-flip-face absolute inset-x-0 top-0 w-full"
            style={{
              transform: "rotateY(180deg)",
              pointerEvents: isFlipped ? "auto" : "none",
            }}
          >
            {back}
          </div>

          {/* ── Halo Sweep ── */}
          {flipCountRef.current > 0 && (
            <motion.div
              key={`halo-${flipTrigger}`}
              className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: HALO_OPACITY_VALUES }}
              transition={{ duration: FLIP_DURATION, times: HALO_OPACITY_TIMES, ease: "easeInOut" }}
            >
              <motion.div
                className="absolute inset-y-0 w-[120%] bg-linear-to-r from-transparent via-cyan-300/10 to-transparent"
                initial={{ x: "-120%" }}
                animate={{ x: "120%" }}
                transition={{ duration: FLIP_DURATION, ease: "easeInOut" }}
              />
            </motion.div>
          )}
        </motion.div>
      </motion.section>
    </div>
  );
}
