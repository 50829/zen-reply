import {
  type ReactNode,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { useAutoResizeWindow } from "../../hooks/useAutoResizeWindow";
import {
  BACKWARD_ROTATE,
  FLIP_SCALE,
  FLIP_WINDOW_EXTRA,
  FORWARD_ROTATE,
  HALO_OPACITY_TIMES,
  HALO_OPACITY_VALUES,
  WINDOW_FIXED_WIDTH,
  WINDOW_MAX_HEIGHT,
  WINDOW_VERTICAL_PADDING,
} from "../../shared/tokens";
import {
  FLIP_ROTATE_TRANSITION,
  FLIP_SCALE_TRANSITION,
  HALO_TRANSITION,
} from "../../shared/motion";

type FlipCardProps = {
  isFlipped: boolean;
  front: ReactNode;
  back: ReactNode;
  panelRef: RefObject<HTMLElement | null>;
  panelAnimateKey: number;
};

export function FlipCard({
  isFlipped,
  front,
  back,
  panelRef,
  panelAnimateKey,
}: FlipCardProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // ── Height management ──────────────────────────────────────────────

  const [targetHeight, setTargetHeight] = useState(0);
  const [isFlipAnimating, setIsFlipAnimating] = useState(false);
  const isFlipAnimatingRef = useRef(false);
  const prevFlippedRef = useRef(isFlipped);
  const hasEverFlipped = useRef(false);
  const flipCountRef = useRef(0);
  const [flipTrigger, setFlipTrigger] = useState(0);

  // ── Window resize hook ─────────────────────────────────────────────

  const { reportContentHeight, resetVisibility } = useAutoResizeWindow({
    width: WINDOW_FIXED_WIDTH,
    maxHeight: WINDOW_MAX_HEIGHT,
    verticalPadding: WINDOW_VERTICAL_PADDING,
  });

  // ── Reset on new session ───────────────────────────────────────────

  const prevPanelKeyRef = useRef(panelAnimateKey);
  if (prevPanelKeyRef.current !== panelAnimateKey) {
    prevPanelKeyRef.current = panelAnimateKey;
    hasEverFlipped.current = false;
    prevFlippedRef.current = isFlipped;
    flipCountRef.current = 0;
    isFlipAnimatingRef.current = false;
    resetVisibility();
  }

  // ── Flip trigger: lock height to max + expand window ───────────────

  useLayoutEffect(() => {
    if (isFlipped !== prevFlippedRef.current) {
      prevFlippedRef.current = isFlipped;
      flipCountRef.current += 1;
      hasEverFlipped.current = true;
      isFlipAnimatingRef.current = true;
      setIsFlipAnimating(true);
      setFlipTrigger((n) => n + 1);

      const fh = frontRef.current?.offsetHeight ?? 0;
      const bh = backRef.current?.offsetHeight ?? 0;
      const maxH = Math.max(fh, bh);
      if (maxH > 0) {
        setTargetHeight(maxH);
        reportContentHeight(maxH + FLIP_WINDOW_EXTRA);
      }
    }
  }, [isFlipped, reportContentHeight]);

  // ── Observe face resizes when NOT flip-animating ───────────────────

  useLayoutEffect(() => {
    if (isFlipAnimating) return;

    const measure = () => {
      if (isFlipAnimatingRef.current) return;

      const h = isFlipped
        ? (backRef.current?.offsetHeight ?? 0)
        : (frontRef.current?.offsetHeight ?? 0);
      if (h > 0) {
        setTargetHeight(h);
        reportContentHeight(h);
      }
    };
    measure();

    const observer = new ResizeObserver(measure);
    if (frontRef.current) observer.observe(frontRef.current);
    if (backRef.current) observer.observe(backRef.current);
    return () => observer.disconnect();
  }, [isFlipped, isFlipAnimating, reportContentHeight]);

  // ── Flip complete: settle height ───────────────────────────────────

  const handleFlipComplete = useCallback(() => {
    // Clear flip state — the ResizeObserver useLayoutEffect will
    // re-measure the natural height synchronously before paint.
    isFlipAnimatingRef.current = false;
    setIsFlipAnimating(false);
  }, []);

  // ── Animation values ───────────────────────────────────────────────

  const rotateKeyframes = isFlipped ? FORWARD_ROTATE : BACKWARD_ROTATE;
  const animateRotateY = hasEverFlipped.current ? rotateKeyframes : (isFlipped ? 180 : 0);
  const animateScale = hasEverFlipped.current ? FLIP_SCALE : 1;

  return (
    <div
      data-tauri-drag-region
      className="relative flex min-h-full w-full items-start justify-center px-4 pt-4 pb-12 perspective-distant"
    >
      <section
        key={panelAnimateKey}
        ref={panelRef}
        className="zen-panel-enter w-142 transform-3d"
      >
        {/* 3D Flip Container */}
        <motion.div
          className="relative w-full rounded-3xl transform-3d"
          style={{
            height: targetHeight || "auto",
            willChange: isFlipAnimating ? "transform" : "auto",
          }}
          initial={false}
          animate={{
            rotateY: animateRotateY,
            scale: animateScale,
            //boxShadow: animateShadow,
          }}
          transition={{
            rotateY: FLIP_ROTATE_TRANSITION,
            scale: FLIP_SCALE_TRANSITION,
            //boxShadow: FLIP_SHADOW_TRANSITION,
          }}
          onAnimationComplete={handleFlipComplete}
        >
          {/* Front face */}
          <div
            ref={frontRef}
            className="backface-hidden absolute inset-x-0 top-0 w-full"
            style={{
              pointerEvents: isFlipped ? "none" : "auto",
              ...(isFlipAnimating ? { height: targetHeight } : {}),
            }}
          >
            {front}
          </div>

          {/* Back face */}
          <div
            ref={backRef}
            className="backface-hidden absolute inset-x-0 top-0 w-full"
            style={{
              transform: "rotateY(180deg)",
              pointerEvents: isFlipped ? "auto" : "none",
              ...(isFlipAnimating ? { height: targetHeight } : {}),
            }}
          >
            {back}
          </div>

          {/* Halo Sweep */}
          {flipCountRef.current > 0 && (
            <motion.div
              key={`halo-${flipTrigger}`}
              className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-3xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: HALO_OPACITY_VALUES }}
              transition={{ ...HALO_TRANSITION, times: HALO_OPACITY_TIMES }}
            >
              <motion.div
                className="absolute inset-y-0 w-[120%] bg-linear-to-r from-transparent via-cyan-300/10 to-transparent"
                initial={{ x: "-120%" }}
                animate={{ x: "120%" }}
                transition={HALO_TRANSITION}
              />
            </motion.div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
