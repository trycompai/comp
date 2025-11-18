'use client';

import { motion } from 'framer-motion';
import { Shield, Sparkles, Zap } from 'lucide-react';

interface OnboardingLoadingAnimationProps {
  itemType: 'risks' | 'vendors';
  title: string;
  description: string;
}

export function OnboardingLoadingAnimation({
  itemType,
  title,
  description,
}: OnboardingLoadingAnimationProps) {
  const Icon = itemType === 'risks' ? Shield : Shield; // Could use different icon for vendors if needed

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-16 px-4">
      {/* Main Animation Container */}
      <div className="relative w-full max-w-2xl">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-4 gap-4 h-full">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="border border-foreground/10 rounded" />
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
                ease: 'easeInOut',
              }}
              className="flex items-center gap-4"
            >
              {/* Item Card */}
              <div className="flex-1 bg-card border border-border rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  >
                    <Icon className="h-5 w-5 text-primary" />
                  </motion.div>

                  {/* Content Skeleton */}
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-muted/60 rounded w-1/2 animate-pulse" />
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
                      ease: 'easeInOut',
                    }}
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
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
                  className="w-8 h-0.5 bg-primary/30"
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
            ease: 'easeInOut',
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
            <div className="relative bg-primary/10 backdrop-blur-sm rounded-full p-6 border-2 border-primary/30">
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Text Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center space-y-2"
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm max-w-md">{description}</p>
      </motion.div>
    </div>
  );
}

