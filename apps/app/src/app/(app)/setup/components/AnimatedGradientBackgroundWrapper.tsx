'use client';

import { useEffect, useState } from 'react';
import { AnimatedGradientBackground } from './AnimatedGradientBackground';

export function AnimatedGradientBackgroundWrapper() {
  const [scale, setScale] = useState(0.7);

  useEffect(() => {
    // Listen for step changes
    const handleStepChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { stepIndex, totalSteps } = customEvent.detail;
      const progressScale = 0.7 + (stepIndex / (totalSteps - 1)) * 0.8;
      setScale(progressScale);
    };

    window.addEventListener('onboarding-step-change', handleStepChange);

    return () => {
      window.removeEventListener('onboarding-step-change', handleStepChange);
    };
  }, []);

  return <AnimatedGradientBackground scale={scale} />;
}
