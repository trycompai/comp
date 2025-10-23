import { useEffect, useState } from 'react';

interface UsePageLoadAnimationOptions {
  delay?: number;
  staggerDelay?: number;
}

export function usePageLoadAnimation({
  delay = 0,
  staggerDelay = 100,
}: UsePageLoadAnimationOptions = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);

      // Stagger animations
      const staggerTimer = setTimeout(() => {
        setAnimationStep(1);
      }, staggerDelay);

      return () => clearTimeout(staggerTimer);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, staggerDelay]);

  return {
    isVisible,
    animationStep,
    getAnimationClass: (step: number) => {
      if (!isVisible) return 'opacity-0 translate-y-4';
      if (animationStep < step) return 'opacity-0 translate-y-4';
      return 'opacity-100 translate-y-0';
    },
    getTransitionClass: (step: number, duration = 500) =>
      `transition-all duration-${duration} ease-out delay-${step * 100}`,
  };
}
