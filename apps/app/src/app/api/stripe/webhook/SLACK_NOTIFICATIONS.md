# Stripe Webhook Slack Notifications

This webhook sends sales notifications to Slack when important Stripe events occur.

## Events Tracked

Each notification is compact and displays on a single line with color coding:

1. **New Subscription** (💰 Green #36C537)
   - Format: `💰 New Subscription | OrgName: email@example.com • $99.00: Monthly`
   - Triggered when a customer starts a paid subscription directly

2. **New Trial Started** (🎉 Blue #0084FF)
   - Format: `🎉 New Trial Started | OrgName: email@example.com • $990.00: Yearly`
   - Triggered when a customer starts a trial subscription

3. **Trial Converted to Paid** (🚀 Purple #9F40E6)
   - Format: `🚀 Trial Converted to Paid | OrgName: email@example.com • $99.00: Monthly`
   - Triggered when a trial subscription converts to an active paid subscription

4. **Trial/Subscription Cancelled** (❌ Red #DC3545)
   - Format: `❌ Subscription Cancelled | OrgName: email@example.com • $99.00 Monthly: Ends 12/31/2024`
   - Triggered when a customer cancels their trial or subscription

5. **Subscription Ended** (🚫 Dark Red #8B0000)
   - Format: `🚫 Subscription Ended | OrgName: email@example.com • Reason: Cancelled`
   - Triggered when a subscription actually ends

## Setup

1. Add the Slack webhook URL to your environment variables:

   ```
   SLACK_SALES_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   ```

2. The webhook will automatically send notifications to your Slack channel when these events occur.

## Notification Format

Each notification includes:

- Color-coded attachment for quick visual identification
- Organization name
- Customer email (organization owner) - **clickable link to Stripe dashboard**
- Relevant details (amount, plan, dates, etc.)

The customer email is displayed as a clickable link that takes you directly to the customer's page in Stripe Dashboard (e.g., `https://dashboard.stripe.com/customers/cus_XXXXX`)

## Testing

To test the webhook locally, you can use Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Then trigger test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```
