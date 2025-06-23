'use client';

import { useEffect, useState } from 'react';
import { AnimatedGradientBackground } from './AnimatedGradientBackground';

export function AnimatedGradientBackgroundWrapper() {
  const [scale, setScale] = useState(0.7);

  useEffect(() => {
    // Function to calculate scale from localStorage
    const updateScale = () => {
      if (typeof window !== 'undefined') {
        const stepIndex = parseInt(localStorage.getItem('onboarding-step-index') || '0');
        const totalSteps = parseInt(localStorage.getItem('onboarding-total-steps') || '9');

        // Calculate scale based on step progress (0.7 to 1.5)
        const progressScale = 0.7 + (stepIndex / (totalSteps - 1)) * 0.8;
        setScale(progressScale);
      }
    };

    // Initial load
    updateScale();

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
