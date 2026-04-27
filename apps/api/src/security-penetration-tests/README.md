# Security Penetration Tests (Maced Integration)

This module exposes Comp API endpoints under `/v1/security-penetration-tests` and orchestrates report generation with Maced (`/v1/pentests`).

## Endpoints

- `GET /v1/security-penetration-tests`
- `POST /v1/security-penetration-tests`
- `GET /v1/security-penetration-tests/:id`
- `GET /v1/security-penetration-tests/:id/progress`
- `GET /v1/security-penetration-tests/:id/report`
- `POST /v1/security-penetration-tests/webhook`

## Required environment variables

- `MACED_API_KEY`: Maced API key used by Nest API when calling provider endpoints.

## Optional environment variables

- `MACED_API_BASE_URL`: Defaults to `https://api.maced.ai`.
- `SECURITY_PENETRATION_TESTS_WEBHOOK_URL`: Base callback URL for Comp webhook endpoint.

## Provider contract (Maced)

Per https://api.maced.ai/docs:

- `POST /v1/pentests` response is **only** `{ id, status }`. No per-run webhook token is issued.
- `GET /v1/pentests/:id` returns the full run shape, including `targetUrl`, timestamps, `progress`, etc.
- Maced POSTs **signed** `pentest.completed` / `pentest.failed` events to the configured `webhookUrl`. Signature verification uses the shared secret available from `GET /v1/webhooks/secret` (Maced SDK helper: `verifyMacedWebhook`).

## Webhook receiving (TODO — not yet aligned with Maced contract)

The current webhook handler at `POST /v1/security-penetration-tests/webhook` still expects a per-run token and will reject real Maced callbacks. This is a known gap. Planned work:

1. Fetch and cache the shared webhook secret from Maced (`GET /v1/webhooks/secret`).
2. Verify the signature header on incoming webhook requests.
3. Drop the per-run handshake verification from `verifyAndRecordWebhookHandshake`.

Until this is done, the UI relies on polling (`GET /v1/security-penetration-tests/:id`) for status updates, which works end-to-end.

## Notes

- Frontend should call Nest API only (no Next.js proxy routes for this feature).
- Create response fields missing from Maced (`targetUrl`, `createdAt`, `updatedAt`) are backfilled server-side from the user's payload so the Comp API response shape stays complete.

## Provider types & contract drift

Types come from the `@maced/api-client` SDK. If Maced releases a breaking change to their OpenAPI, bumping the SDK version surfaces it at typecheck time — that replaces the old homegrown contract canary we used to run.
