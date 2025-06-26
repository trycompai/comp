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

    // Fallback to anonymous tracking ID from cookies
    const cookieStore = await cookies();
    const anonymousId =
      cookieStore.get('_ga')?.value || // Google Analytics client ID
      cookieStore.get('ph_distinct_id')?.value || // PostHog distinct ID
      null;

    return anonymousId;
  } catch (error) {
    console.error('Error getting tracking user ID:', error);
    return null;
  }
}

/**
 * Server-side event tracking that sends to all services
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

    // 2. Google Analytics Measurement Protocol (if you have GA4 API Secret)
    // Note: You'll need to add GA4_API_SECRET and GA4_MEASUREMENT_ID to your env
    if (process.env.GA4_API_SECRET && process.env.GA4_MEASUREMENT_ID) {
      await sendToGoogleAnalytics(eventName, parameters, distinctId);
    }

    // 3. LinkedIn Conversions API (if you have access token)
    // Note: LinkedIn's Conversions API requires special access
    if (eventName === 'purchase_completed' && process.env.LINKEDIN_CONVERSIONS_ACCESS_TOKEN) {
      await sendToLinkedInConversions(parameters);
    }

    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics Server Event]', {
        event: eventName,
        userId: distinctId,
        parameters,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error tracking server event:', error);
    // Don't throw - tracking should not break the application
  }
}

/**
 * Send event to Google Analytics 4 via Measurement Protocol
 */
async function sendToGoogleAnalytics(
  eventName: string,
  parameters?: TrackingEventParameters,
  clientId?: string,
) {
  const apiSecret = process.env.GA4_API_SECRET;
  const measurementId = process.env.GA4_MEASUREMENT_ID;

  if (!apiSecret || !measurementId) return;

  try {
    const payload = {
      client_id: clientId || 'server_' + Date.now(),
      events: [
        {
          name: eventName,
          params: {
            ...parameters,
            engagement_time_msec: '100',
            session_id: Date.now().toString(),
          },
        },
      ],
    };

    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      console.error('GA4 Measurement Protocol error:', response.statusText);
    }
  } catch (error) {
    console.error('Error sending to Google Analytics:', error);
  }
}

/**
 * Send conversion event to LinkedIn Conversions API
 */
async function sendToLinkedInConversions(parameters?: TrackingEventParameters) {
  const accessToken = process.env.LINKEDIN_CONVERSIONS_ACCESS_TOKEN;
  const conversionId = process.env.NEXT_PUBLIC_LINKEDIN_CONVERSION_ID;

  if (!accessToken || !conversionId) return;

  try {
    // LinkedIn Conversions API implementation
    // Note: This is a simplified example - LinkedIn's API has specific requirements
    const payload = {
      conversion: conversionId,
      conversionHappenedAt: Date.now(),
      conversionValue: {
        currencyCode: parameters?.currency || 'USD',
        amount: parameters?.value?.toString() || '0',
      },
      // Add user data if available (email hash, etc.)
    };

    const response = await fetch('https://api.linkedin.com/v2/conversionEvents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202401',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('LinkedIn Conversions API error:', response.statusText);
    }
  } catch (error) {
    console.error('Error sending to LinkedIn Conversions:', error);
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
