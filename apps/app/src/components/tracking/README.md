# Product Analytics Tracking

The product app intentionally tracks product analytics only. Marketing pixels belong on the marketing site, not on `app.trycomp.ai`.

Revenue, customer, and signed-deal measurement for paid media lives in HubSpot lifecycle imports. App-side `purchase_completed` events are product analytics only and must not be wired to ad conversion pixels.

## Service Integrated

1. **PostHog** - Product analytics and feature usage tracking

## Environment Variables

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## How It Works

### Client-Side Tracking

The `trackEvent()` function in `utils/tracking.ts` sends events to PostHog via `Analytics.track()`.

### Server-Side Tracking

The `trackEventServer()` function in `utils/server-tracking.ts` sends events to PostHog via the Node.js SDK.

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
- `purchase_completed` - Product billing/checkout success in PostHog only
- `upgrade_completed` - After successful upgrade

### Additional Events

- `pageview` - Standard page views
- `signup_started` - When signup begins
- `signup_completed` - When signup completes

## Usage Examples

### Client-Side Tracking

```typescript
import { trackEvent, trackPurchaseEvent } from '@/utils/tracking';

trackEvent('feature_used', {
  event_category: 'engagement',
  event_label: 'export_data',
  feature_name: 'data_export',
});

trackPurchaseEvent('checkout_started', 99, 'USD');
```

### Server-Side Tracking

```typescript
import { trackEventServer, trackPurchaseCompletionServer } from '@/utils/server-tracking';

await trackEventServer(
  'api_called',
  {
    event_category: 'api',
    endpoint: '/api/data',
    method: 'POST',
  },
  userId,
);

await trackPurchaseCompletionServer(organizationId, 'starter', 99, userId);
```

## Testing

In development, server-side events are logged to the console. In the browser, check the Network tab for PostHog `/e` requests.
