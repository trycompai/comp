"use client";

import { Shield, Sparkles, Zap } from "lucide-react";
import { motion } from "motion/react";

interface OnboardingLoadingAnimationProps {
  itemType: "risks" | "vendors";
  title: string;
  description: string;
}

export function OnboardingLoadingAnimation({
  itemType,
  title,
  description,
}: OnboardingLoadingAnimationProps) {
  const Icon = itemType === "risks" ? Shield : Shield; // Could use different icon for vendors if needed

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 py-16">
      {/* Main Animation Container */}
      <div className="relative w-full max-w-2xl">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid h-full grid-cols-4 gap-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="border-foreground/10 rounded border" />
            ))}
          </div>
        </div>

        {/* Floating Item Cards Animation */}
        <div className="relative space-y-6">
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -50, scale: 0.8 }}
              animate={{
                opacity: [0, 1, 1, 0],
                x: [0, 0, 100, 200],
                scale: [0.8, 1, 1, 0.8],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: index * 0.5,
                ease: "easeInOut",
              }}
              className="flex items-center gap-4"
            >
              {/* Item Card */}
              <div className="bg-card border-border flex-1 rounded-lg border p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Icon className="text-primary h-5 w-5" />
                  </motion.div>

                  {/* Content Skeleton */}
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-4 w-3/4 animate-pulse rounded" />
                    <div className="bg-muted/60 h-3 w-1/2 animate-pulse rounded" />
                  </div>

                  {/* Sparkle Effect */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <Sparkles className="text-primary h-4 w-4" />
                  </motion.div>
                </div>
              </div>

              {/* Arrow/Connection */}
              {index < 3 && (
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    scaleX: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: index * 0.5 + 0.3,
                  }}
                  className="bg-primary/30 h-0.5 w-8"
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Central AI Processing Indicator */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <div className="relative">
            <div className="bg-primary/20 absolute inset-0 rounded-full blur-xl" />
            <div className="bg-primary/10 border-primary/30 relative rounded-full border-2 p-6 backdrop-blur-sm">
              <Zap className="text-primary h-8 w-8" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Text Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12 space-y-2 text-center"
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground max-w-md text-sm">{description}</p>
      </motion.div>
    </div>
  );
}
