import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface RevealProps {
  children: ReactNode;
  /** Seconds to wait before starting; staggers neighbouring blocks. */
  delay?: number;
  className?: string;
}

/**
 * Fades and lifts its children into place the first time they scroll into
 * view. Renders them in place, without motion, when the viewer prefers
 * reduced motion.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ type: "spring", bounce: 0, duration: 0.8, delay }}
    >
      {children}
    </motion.div>
  );
}
