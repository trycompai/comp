import {
  trackEvent,
  trackOnboardingEvent,
  trackPurchaseEvent,
  type TrackingEventName,
  type TrackingEventParameters,
} from '@/utils/tracking';
import { useCallback } from 'react';

/**
 * React hook for product analytics tracking.
 */
export function useUnifiedTracking() {
  const track = useCallback(
    (eventName: TrackingEventName, parameters?: TrackingEventParameters) => {
      trackEvent(eventName, parameters);
    },
    [],
  );

  const trackOnboarding = useCallback(
    (step: string, stepNumber?: number, additionalData?: Record<string, any>) => {
      trackOnboardingEvent(step, stepNumber, additionalData);
    },
    [],
  );

  const trackPurchase = useCallback(
    (
      eventName: Extract<
        TrackingEventName,
        'upgrade_started' | 'upgrade_completed' | 'checkout_started' | 'purchase_completed'
      >,
      value?: number,
      currency: string = 'USD',
    ) => {
      trackPurchaseEvent(eventName, value, currency);
    },
    [],
  );

  return {
    track,
    trackOnboarding,
    trackPurchase,
  };
}
