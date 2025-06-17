import posthog from 'posthog-js';
import type { Properties } from 'posthog-js';

export const Analytics = {
  track: (eventName: string, properties?: Properties) => {
    if (typeof window === 'undefined') return;
    posthog.capture(eventName, properties);
  },

  identify: (distinctId: string, properties?: Properties) => {
    if (typeof window === 'undefined') return;
    posthog.identify(distinctId, properties);
  },

  reset: () => {
    if (typeof window === 'undefined') return;
    posthog.reset();
  },

  page: (properties?: Properties) => {
    if (typeof window === 'undefined') return;
    posthog.capture('$pageview', properties);
  },
};

// Export components for client usage
export * from './components/provider';
export * from './components/page-view';
export * from './server';
