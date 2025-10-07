'use client';

import type { Onboarding } from '@db';
import { usePathname } from 'next/navigation';
import { OnboardingTracker } from './OnboardingTracker';

interface Props {
  onboarding: Onboarding;
}

export function ConditionalOnboardingTracker({ onboarding }: Props) {
  const pathname = usePathname();
  const isAutomationRoute = pathname.includes('/automation');

  // Don't render the OnboardingTracker if we're on an automation route
  if (isAutomationRoute) {
    return null;
  }

  return <OnboardingTracker onboarding={onboarding} />;
}
