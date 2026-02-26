import { type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type FlipCardProps = {
  isFlipped: boolean;
  front: ReactNode;
  back: ReactNode;
  panelRef: RefObject<HTMLElement | null>;
  panelAnimateKey: number;
  panelWidthClass: string;
  minHeight: number;
};

export function FlipCard({
  isFlipped,
  front,
  back,
  panelRef,
  panelAnimateKey,
  panelWidthClass,
  minHeight,
}: FlipCardProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [flipHeight, setFlipHeight] = useState(minHeight);

  // Measure active face height for smooth 3D flip transition
  useEffect(() => {
    const measure = () => {
      const el = isFlipped ? backRef.current : frontRef.current;
      const h = el?.offsetHeight ?? 0;
      if (h > 0) setFlipHeight(h);
    };
    measure();

    const observer = new ResizeObserver(measure);
    if (frontRef.current) observer.observe(frontRef.current);
    if (backRef.current) observer.observe(backRef.current);
    return () => observer.disconnect();
  }, [isFlipped]);

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden p-4"
      style={{ perspective: 1200 }}
    >
      <motion.section
        key={panelAnimateKey}
        ref={panelRef}
        initial={{ y: 20, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformStyle: "preserve-3d" }}
        className={`transition-[max-width,width] duration-300 ${panelWidthClass}`}
      >
        <motion.div
          className="relative w-full"
          style={{ transformStyle: "preserve-3d" }}
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
