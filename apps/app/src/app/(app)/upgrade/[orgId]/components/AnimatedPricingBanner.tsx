'use client';

import { AnimatedGradientBackground } from '@/app/(app)/setup/components/AnimatedGradientBackground';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export function AnimatedPricingBanner() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const messages = [
    'AI is analyzing your compliance needs',
    'Customizing your security framework',
    'Building your compliance roadmap',
    'Optimizing for your industry requirements',
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
    <div className="sticky top-[49px] z-[9] w-full h-10 overflow-hidden select-none">
      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 backdrop-blur-md" />

      {/* Clipped animated background */}
      <div className="absolute inset-0 overflow-hidden opacity-70">
        <div className="absolute inset-0 scale-[3] translate-y-1/2">
          <AnimatedGradientBackground scale={2} />
        </div>
      </div>

      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      </div>

      {/* Top border for depth when sticky */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 transition-opacity duration-300 group-[.scrolled]:opacity-100" />

      {/* Bottom border with glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex items-center justify-center px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="absolute inset-0 blur-sm bg-primary/50 animate-pulse" />
          </div>

          <span className="text-sm font-medium text-foreground/90 transition-all duration-500 ease-in-out">
            {messages[currentMessageIndex]}
          </span>

          <div className="flex gap-1 ml-1">
            <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-pulse" />
            <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-pulse [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-pulse [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
