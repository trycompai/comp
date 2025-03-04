"use client";

import { motion } from "framer-motion";

export function AnimatedBar({
  index = 0,
  children,
}: {
  index?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ scaleX: 0, originX: 0 }}
      animate={{ scaleX: 1 }}
      className="absolute inset-0"
      transition={{
        duration: 0.5,
        ease: "easeOut",
        delay: index * 0.075, // Staggered delay effect
      }}
    >
      {children}
    </motion.div>
  );
}
