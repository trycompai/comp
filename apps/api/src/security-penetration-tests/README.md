# Security Penetration Tests (Maced Integration)

This module exposes Comp API endpoints under `/v1/security-penetration-tests` and orchestrates report generation with Maced (`/v1/pentests`).

## Endpoints

- `GET /v1/security-penetration-tests`
- `POST /v1/security-penetration-tests`
- `GET /v1/security-penetration-tests/:id`
- `GET /v1/security-penetration-tests/:id/progress`
- `GET /v1/security-penetration-tests/:id/report`
- `GET /v1/security-penetration-tests/:id/pdf`
- `POST /v1/security-penetration-tests/webhook`

## Required environment variables

- `MACED_API_KEY`: Maced API key used by Nest API when calling provider endpoints.

## Optional environment variables

- `MACED_API_BASE_URL`: Defaults to `https://api.maced.ai`.
- `SECURITY_PENETRATION_TESTS_WEBHOOK_URL`: Base callback URL for Comp webhook endpoint.

## Webhook handshake model

1. On create (`POST /v1/security-penetration-tests`), Maced issues a per-job `webhookToken` and returns it in the create response.
2. Comp does not send a user-provided `webhookToken` upstream; the value is reserved for provider issuance.
3. If callback target resolves to Comp webhook route and Maced returns `webhookToken`, Comp persists a handshake record in `secrets` using name:
   - `security_penetration_test_webhook_<reportId>`
4. On webhook receive, Comp:
   - resolves org context (`X-Organization-Id` or `orgId`/`organizationId` query),
   - resolves token (`webhookToken` query or `X-Webhook-Token` header),
   - requires a persisted per-job handshake and verifies token hash match,
   - tracks idempotency (`X-Webhook-Id`/`X-Request-Id`, plus payload hash fallback),
   - returns `duplicate: true` for replayed webhook events.

## Notes

- Frontend should call Nest API only (no Next.js proxy routes for this feature).
- Provider callbacks to non-Comp webhook URLs are passed through and are not forced to include Comp-specific webhook tokens.

## Maced contract canary test (real provider)

Use this e2e canary to detect Maced API contract drift against the live provider without creating new paid runs.

- Test file: `apps/api/test/maced-contract.e2e-spec.ts`
- Command:
  - `MACED_API_KEY=<key> bun run test:e2e:maced`
- Optional deep-check env:
  - `MACED_CONTRACT_E2E_RUN_ID=<existing_provider_run_id>`
  - When present, the test also calls `GET /v1/pentests/:id` and `GET /v1/pentests/:id/progress`.
