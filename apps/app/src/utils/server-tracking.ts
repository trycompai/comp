import { track as trackPostHog } from '@/app/posthog';
import { cookies, headers } from 'next/headers';
import type { TrackingEventName, TrackingEventParameters } from './tracking';

/**
 * Get user ID from session or cookies for tracking
 */
async function getTrackingUserId(): Promise<string | null> {
  try {
    // Try to get from auth session first
    const { auth } = await import('@/utils/auth');
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user?.id) {
      return session.user.id;
    }

    // Fallback to anonymous PostHog tracking ID from cookies
    const cookieStore = await cookies();
    const anonymousId = cookieStore.get('ph_distinct_id')?.value || null;

    return anonymousId;
  } catch (error) {
    console.error('Error getting tracking user ID:', error);
    return null;
  }
}

/**
 * Server-side event tracking that sends to PostHog.
 */
export async function trackEventServer(
  eventName: TrackingEventName,
  parameters?: TrackingEventParameters,
  userId?: string | null,
) {
  try {
    // Get user ID if not provided
    const distinctId = userId || (await getTrackingUserId()) || 'anonymous';

    // 1. PostHog Server-Side Tracking
    await trackPostHog(distinctId, eventName, parameters);
  } catch (error) {
    console.error('Error tracking server event:', error);
    // Don't throw - tracking should not break the application
  }
}

/**
 * Track purchase completion on the server
 */
export async function trackPurchaseCompletionServer(
  organizationId: string,
  planType: string,
  value?: number,
  userId?: string | null,
) {
  await trackEventServer(
    'purchase_completed',
    {
      event_category: 'ecommerce',
      organization_id: organizationId,
      plan_type: planType,
      value,
      currency: 'USD',
    },
    userId,
  );

  await trackEventServer(
    'upgrade_completed',
    {
      event_category: 'ecommerce',
      organization_id: organizationId,
      plan_type: planType,
    },
    userId,
  );
}

/**
 * Track onboarding events on the server
 */
export async function trackOnboardingEventServer(
  step: string,
  stepNumber?: number,
  additionalData?: Record<string, any>,
  userId?: string | null,
) {
  await trackEventServer(
    'onboarding_step_completed',
    {
      event_category: 'onboarding',
      event_label: step,
      step_name: step,
      step_number: stepNumber,
      ...additionalData,
    },
    userId,
  );
}
