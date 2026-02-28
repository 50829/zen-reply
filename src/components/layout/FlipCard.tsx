import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type FlipCardProps = {
  isFlipped: boolean;
  front: ReactNode;
  back: ReactNode;
  panelRef: RefObject<HTMLElement | null>;
  panelAnimateKey: number;
  panelWidthClass: string;
  minHeight: number;
  /** Reports the measured content height (max of front/back faces) so the
   *  window can be resized to exactly fit the content, independent of any
   *  intermediate animation height applied by Framer Motion. */
  onContentHeightChange?: (height: number) => void;
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
  const [flipHeight, setFlipHeight] = useState(minHeight);

  // Measure both faces and use max height for stable 3D flip transition.
  // useLayoutEffect ensures the first measurement runs before the browser paints,
  // preventing a single-frame flash at the stale minHeight value.
  useLayoutEffect(() => {
    const measure = () => {
      const fh = frontRef.current?.offsetHeight ?? 0;
      const bh = backRef.current?.offsetHeight ?? 0;
      const h = Math.max(fh, bh);
      if (h > 0) {
        setFlipHeight(h);
        onContentHeightChange?.(h);
      }
    };
    measure();

    const observer = new ResizeObserver(measure);
    if (frontRef.current) observer.observe(frontRef.current);
    if (backRef.current) observer.observe(backRef.current);
    return () => observer.disconnect();
  }, [isFlipped, onContentHeightChange]);

  return (
    <div
      data-tauri-drag-region
      className="relative flex min-h-full w-full items-center justify-center p-4"
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
        <motion.div
          className="relative w-full"
          style={{ transformStyle: "preserve-3d" }}
          initial={false}
          animate={{
            rotateY: isFlipped ? 180 : 0,
            height: flipHeight,
          }}
          transition={{
            rotateY: { type: "spring", stiffness: 70, damping: 16 },
            height: { type: "spring", stiffness: 170, damping: 24 },
          }}
        >
          {/* Front face */}
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
        </motion.div>
      </motion.section>
    </div>
  );
}
