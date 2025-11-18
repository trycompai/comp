'use client';

import { OnboardingLoadingAnimation } from '@/components/onboarding-loading-animation';

export function RisksLoadingAnimation() {
  return (
    <OnboardingLoadingAnimation
      itemType="risks"
      title="AI is working on your risks"
      description="Our AI is analyzing your organization and creating personalized risks. This may take a few moments."
    />
  );
}
