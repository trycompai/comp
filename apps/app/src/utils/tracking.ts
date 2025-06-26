import { Analytics } from '@comp/analytics';

// Tracking event types
export type TrackingEventName =
  | 'pageview'
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'framework_selected'
  | 'organization_created'
  | 'upgrade_started'
  | 'upgrade_completed'
  | 'checkout_started'
  | 'purchase_completed'
  | 'conversion';

export interface TrackingEventParameters {
  event_category?: string;
  event_label?: string;
  value?: number;
  currency?: string;
  [key: string]: any;
}

declare global {
  interface Window {
    dataLayer?: Object[];
    lintrk?: (action: string, data: any) => void;
  }
}

/**
 * Unified tracking that sends events to all services
 */
export function trackEvent(eventName: TrackingEventName, parameters?: TrackingEventParameters) {
  if (typeof window === 'undefined') return;

  // 1. Google Tag Manager
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...parameters,
    });
  }

  // 2. PostHog
  Analytics.track(eventName, parameters);

  // 3. LinkedIn - for specific conversion events
  if (eventName === 'purchase_completed' && process.env.NEXT_PUBLIC_LINKEDIN_CONVERSION_ID) {
    trackLinkedInConversion(process.env.NEXT_PUBLIC_LINKEDIN_CONVERSION_ID);
  }
}

/**
 * Track conversion with LinkedIn
 */
export function trackLinkedInConversion(conversionId: string) {
  if (typeof window !== 'undefined' && window.lintrk) {
    window.lintrk('track', { conversion_id: conversionId });
  }
}

/**
 * Track page view
 */
export function trackPageView(pagePath?: string, pageTitle?: string) {
  const path = pagePath || window.location.pathname;
  const title = pageTitle || document.title;

  trackEvent('pageview', {
    page_path: path,
    page_title: title,
  });

  // PostHog has its own pageview tracking
  Analytics.page({
    path,
    title,
  });
}

/**
 * Track onboarding events
 */
export function trackOnboardingEvent(
  step: string,
  stepNumber?: number,
  additionalData?: Record<string, any>,
) {
  trackEvent('onboarding_step_completed', {
    event_category: 'onboarding',
    event_label: step,
    step_name: step,
    step_number: stepNumber,
    ...additionalData,
  });
}

/**
 * Track purchase/upgrade events
 */
export function trackPurchaseEvent(
  eventName: Extract<
    TrackingEventName,
    'upgrade_started' | 'upgrade_completed' | 'checkout_started' | 'purchase_completed'
  >,
  value?: number,
  currency: string = 'USD',
) {
  trackEvent(eventName, {
    event_category: 'ecommerce',
    value,
    currency,
  });
}
