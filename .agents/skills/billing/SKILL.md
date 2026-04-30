---
name: billing
description: Use when changing Comp AI billing, Stripe products/prices, subscription checkout, org payment methods, entitlements, usage ledgers, invoices, or billing webhooks.
metadata:
  short-description: Comp AI billing architecture
---

# Billing

Comp AI billing is SKU-first and subscription-ready. Stripe is the payment provider; Comp AI owns catalog definitions, entitlement state, usage gating, and audit history.

## Core Rules

- Use `@trycompai/billing` for SKU keys, amounts, Stripe product IDs, Stripe price IDs, cadence, and included usage.
- Do not add product-specific nullable fields to `OrganizationBilling`.
- Keep org-level billing generic: `stripeCustomerId`, `stripePaymentMethodId`, and `paymentMethodUpdatedAt`.
- Store per-product state in generic per-SKU tables keyed by `skuKey`.
- Gate paid actions from local entitlement/usage state, not directly from Stripe object reads.
- Treat Stripe webhooks as eventually consistent, retryable, and possibly out of order.
- Make webhook and entitlement handling idempotent with Stripe event IDs, invoice IDs, subscription item IDs, and period start/end.
- Archive accidental live/test Stripe objects instead of reusing them blindly.

## Current SKU Shape

- `background_check_one_time`: one-time `$49` background check.
- `background_checks_monthly_25`: `$249/mo`, includes 25 background checks per month.
- `pentest_monthly_5`: `$399/mo`, includes 5 penetration-test scans per month.

Live catalog entries should only be added after deliberate live Stripe object creation.

## Implementation Pattern

1. Add or update the SKU in `packages/billing/src/catalog.ts`.
2. Store Stripe IDs in the catalog by environment rather than adding new env vars.
3. Create subscriptions through Stripe Checkout `mode: subscription`.
4. Use the shared Stripe customer default payment method unless the product explicitly needs overrides.
5. For allowance products, sync local subscription state from Stripe subscription items and period timestamps.
6. Record usage in the billing usage ledger with a stable idempotency key.
7. Record support-relevant mutations in billing audit events.

## Webhooks

Handle these events before launching subscription access:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Provision or renew allowance only for the matching subscription item and SKU. Do not use generic invoice-level periods for multi-item subscriptions.

## Validation

- Run `bun run db:generate` after Prisma schema changes.
- Run `bun run check:prisma-schemas` to catch stale copied schema fragments.
- Run catalog tests after SKU changes.
- Add webhook tests for duplicate events, out-of-order delivery, payment failure, action required, cancellation, and renewal.
