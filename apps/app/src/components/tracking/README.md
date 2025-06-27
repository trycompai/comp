# Unified Tracking Implementation Guide

This implementation provides a unified tracking system that sends events to Google Tag Manager, LinkedIn, and PostHog on both client and server side.

## Services Integrated

1. **Google Tag Manager (GTM)** - For Google Analytics and Google Ads conversion tracking
2. **LinkedIn Insight Tag** - For LinkedIn Ads tracking and conversions
3. **PostHog** - For product analytics and feature usage tracking

## Environment Variables

Add these to your `.env.local` file:

```bash
# Google Tag Manager (Client-side)
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX

# Google Ads Conversion Tracking (Client-side)
NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL=AW-XXXXXXXXX/YYYYYYYYYYY

# Google Analytics 4 (Server-side)
GA4_API_SECRET=your-ga4-api-secret
GA4_MEASUREMENT_ID=G-XXXXXXXXXX

# LinkedIn Insight Tag (Client-side)
NEXT_PUBLIC_LINKEDIN_PARTNER_ID=1234567

# LinkedIn Conversions (Client & Server)
NEXT_PUBLIC_LINKEDIN_CONVERSION_ID=1234567
LINKEDIN_CONVERSIONS_ACCESS_TOKEN=your-linkedin-access-token

# PostHog (Client & Server)
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## How It Works

### Client-Side Tracking

The `trackEvent()` function in `utils/tracking.ts` automatically sends events to:

- Google Tag Manager via `dataLayer.push()`
- PostHog via `Analytics.track()`
- LinkedIn for specific conversion events

### Server-Side Tracking

The `trackEventServer()` function in `utils/server-tracking.ts` sends events to:

- PostHog via the Node.js SDK
- Google Analytics 4 via Measurement Protocol API
- LinkedIn Conversions API (for purchase events)

## Events Tracked

### Onboarding Events

- `onboarding_started` - When user begins onboarding
- `onboarding_step_completed` - Each step completion with step name and number
- `framework_selected` - When frameworks are selected
- `organization_created` - When organization is created
- `onboarding_completed` - When onboarding is finished

### Ecommerce Events

- `upgrade_started` - When user views pricing page
- `checkout_started` - When user clicks a pricing plan
- `purchase_completed` - When payment is successful
- `upgrade_completed` - After successful upgrade
- `conversion` - Google Ads specific conversion event

### Additional Events

- `pageview` - Standard page views
- `signup_started` - When signup begins
- `signup_completed` - When signup completes

## Conversion Tracking

### Google Ads Conversion Tracking

When a purchase is completed, the system automatically:

1. Sends a `purchase_completed` event with full ecommerce data
2. Sends a `conversion` event specifically for Google Ads (if configured)

The conversion event includes:

- Transaction value
- Currency (USD)
- Unique transaction ID
- Product details (plan name, category, etc.)

To get your Google Ads conversion label:

1. Go to Google Ads > Tools & Settings > Conversions
2. Create or select your conversion action
3. Click "Tag setup" > "Use Google Tag Manager"
4. Copy the Conversion ID and Conversion Label
5. Format: `AW-CONVERSIONID/CONVERSIONLABEL`

### Client-Side Purchase Tracking

The `CheckoutCompleteTracking` component automatically tracks conversions when users complete a purchase. It reads parameters from the URL:

- `checkoutComplete` - The plan type purchased
- `organizationId` - The organization ID
- `value` - The transaction value

## Usage Examples

### Client-Side Tracking

```typescript
import { trackEvent, trackPurchaseEvent } from '@/utils/tracking';

// Track a custom event
trackEvent('feature_used', {
  event_category: 'engagement',
  event_label: 'export_data',
  feature_name: 'data_export',
});

// Track a purchase event
trackPurchaseEvent('checkout_started', 99, 'USD');
```

### Server-Side Tracking

```typescript
import { trackEventServer, trackPurchaseCompletionServer } from '@/utils/server-tracking';

// Track any event from server
await trackEventServer(
  'api_called',
  {
    event_category: 'api',
    endpoint: '/api/data',
    method: 'POST',
  },
  userId,
);

// Track purchase completion
await trackPurchaseCompletionServer(organizationId, 'starter', 99, userId);
```

## Setup Instructions

### 1. Google Tag Manager Setup

1. Create a GTM container
2. Add Google Analytics 4 Configuration tag
3. Set up conversion triggers for tracked events
4. Enable cross-domain tracking if needed

For Google Ads conversion tracking in GTM:

1. Create a new tag: Google Ads Conversion Tracking
2. Set trigger to fire on `purchase_completed` or `conversion` events
3. Use dataLayer variables for dynamic values

### 2. Google Analytics 4 Server-Side

1. Go to GA4 Admin > Data Streams > your stream
2. Navigate to Measurement Protocol API secrets
3. Create a new API secret
4. Add the secret and measurement ID to your env

### 3. LinkedIn Setup

1. Add LinkedIn Insight Tag partner ID from Campaign Manager
2. Create conversion events in Campaign Manager
3. For Conversions API access, apply for LinkedIn Marketing API access

### 4. PostHog Setup

1. Get your project API key from PostHog
2. Set the host (US or EU cloud)
3. PostHog is automatically initialized via the Analytics provider

## Benefits of Unified Tracking

1. **Consistency** - All events are tracked across all platforms
2. **Server-Side Reliability** - Events are tracked even with ad blockers
3. **Better Attribution** - Cross-device and cross-domain tracking
4. **Privacy Compliant** - Server-side tracking respects user privacy settings
5. **Debugging** - All events logged in development mode

## Testing

In development, all server-side events are logged to the console. Check the browser DevTools for client-side events:

- GTM: Use Tag Assistant or Preview mode
- PostHog: Check the Network tab for `/e` requests
- LinkedIn: Use LinkedIn Insight Tag Helper extension
- Google Ads: Check for `conversion` events in dataLayer
