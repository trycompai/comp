"use client";

import { useEffect, useState } from "react";
import { AnimatedGradientBackground } from "@/app/(app)/setup/components/AnimatedGradientBackground";
import { Sparkles } from "lucide-react";

export function AnimatedPricingBanner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const messages = [
    "AI is analyzing your compliance needs",
    "Customizing your security framework",
    "Building your compliance roadmap",
    "Optimizing for your industry requirements",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [mounted, messages.length]);

  if (!mounted) return null;

  return (
    <div className="sticky top-[49px] z-[9] h-10 w-full overflow-hidden select-none">
      {/* Background with gradient overlay */}
      <div className="from-primary/10 via-primary/5 to-primary/10 absolute inset-0 bg-gradient-to-r backdrop-blur-md" />

      {/* Clipped animated background */}
      <div className="absolute inset-0 overflow-hidden opacity-70">
        <div className="absolute inset-0 translate-y-1/2 scale-[3]">
          <AnimatedGradientBackground scale={2} />
        </div>
      </div>

      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="via-primary/10 absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent to-transparent" />
      </div>

      {/* Top border for depth when sticky */}
      <div className="via-primary/20 absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity duration-300 group-[.scrolled]:opacity-100" />

      {/* Bottom border with glow */}
      <div className="via-primary/50 absolute right-0 bottom-0 left-0 h-px bg-gradient-to-r from-transparent to-transparent" />

      {/* Content */}
      <div className="relative flex h-full items-center justify-center px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Sparkles className="text-primary h-4 w-4" />
            <div className="bg-primary/50 absolute inset-0 animate-pulse blur-sm" />
          </div>

          <span className="text-foreground/90 text-sm font-medium transition-all duration-500 ease-in-out">
            {messages[currentMessageIndex]}
          </span>

          <div className="ml-1 flex gap-1">
            <span className="bg-primary/70 h-1.5 w-1.5 animate-pulse rounded-full" />
            <span className="bg-primary/70 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:150ms]" />
            <span className="bg-primary/70 h-1.5 w-1.5 animate-pulse rounded-full [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
