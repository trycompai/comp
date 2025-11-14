'use client';

import { usePostHog } from 'posthog-js/react';
import { useEffect, useState } from 'react';
import { QuestionnaireParser } from './QuestionnaireParser';

interface FeatureFlagWrapperProps {
  userEmail?: string | null;
}

export function FeatureFlagWrapper({ userEmail }: FeatureFlagWrapperProps) {
  const posthog = usePostHog();
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!posthog) {
      setIsEnabled(false);
      return;
    }

    // Set person properties for flags
    if (userEmail) {
      posthog.setPersonPropertiesForFlags({ email: userEmail });
    }

    // Check if feature flag is already available
    const checkFlag = () => {
      const flagValue = posthog.isFeatureEnabled('ai-vendor-questionnaire');
      if (flagValue !== undefined) {
        setIsEnabled(flagValue);
      }
    };

    // Try to check flag immediately
    checkFlag();

    // Ensure flags are loaded before usage
    // You'll only need to call this on the code for when the first time a user visits
    posthog.onFeatureFlags(() => {
      // Feature flags should be available at this point
      checkFlag();
    });
  }, [posthog, userEmail]);

  // Show loading state while checking feature flag
  if (isEnabled === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show QuestionnaireParser only if feature flag is enabled
  if (isEnabled) {
    return <QuestionnaireParser />;
  }

  // Show message if feature flag is disabled
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-muted-foreground">
        This feature will be available soon.
      </div>
    </div>
  );
}

