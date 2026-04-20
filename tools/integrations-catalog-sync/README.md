# integrations-catalog-sync

Internal tooling to refresh the public `integrations-catalog/` folder from the CompAI production API.

Runs on demand — no cron, no GitHub Action.

## Scripts

- **`sync.mjs`** — fetches every integration from the CompAI internal API, sanitizes the payload (strips check DSL, sync definition, internal IDs, logo URLs), runs a secret-pattern scan on the sanitized output, and writes one JSON per vendor to `integrations-catalog/integrations/<slug>.json`. Dedups by slug, content-hash idempotent, atomic writes, preserves files on fetch failure.
- **`generate-readme.mjs`** — regenerates `integrations-catalog/README.md` with a full category breakdown + alphabetical vendor tables.

## Usage

Both scripts require two environment variables. Never commit either.

```bash
export COMPAI_INTERNAL_API_BASE="<internal api base url>"
export COMPAI_INTERNAL_TOKEN="<internal api token>"

node tools/integrations-catalog-sync/sync.mjs
node tools/integrations-catalog-sync/generate-readme.mjs
```

Optional tuning:

- `SYNC_CONCURRENCY` (default `2`) — concurrent fetches. Higher values trigger API rate limits.
- `SYNC_MIN_INTERVAL_MS` (default `100`) — minimum interval between HTTP requests, enforced globally across all workers. Paces the sync to stay under the API throttle. Increase if you still see 429s; decrease (or set `0`) if the backend is raised later.

## Safety guardrails

`sync.mjs` blocks any sanitized output containing:

- Stripe `pk_/sk_` tokens
- GitHub tokens (`ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`)
- AWS access keys (`AKIA...`)
- Anthropic keys (`sk-ant-...`)
- Jina keys (`jina_...`)
- Slack tokens (`xox...`)
- JWTs
- Bearer tokens
- logo.dev `token=pk_...`

A match aborts the write for that integration and is logged. The script exits non-zero if any blocks happen, so CI or a human review catches it.

## Fields stripped from every integration

- `logoUrl` (contains logo.dev publishable token)
- `checks[].definition` (the DSL — endpoint paths, request bodies, response parsing, aggregation)
- `checks[].variables`
- `syncDefinition` (replaced with boolean `syncSupported`)
- Internal DB IDs (`id`, `integrationId`, `taskMapping`, credential field `id`s)
- Credential field `placeholder` values

## Fields published

- `slug`, `name`, `description`, `category`
- `docsUrl`, `baseUrl`
- `authConfig.type` + sanitized `authConfig.config` (setupInstructions, createAppUrl, setupScript, credentialFields with only `label`/`type`/`required`/`helpText`, scopes, clientAuthMethod, supportsRefreshToken, usernameField, passwordField)
- `capabilities`, `supportsMultipleConnections`, `isActive`
- `checks[]` with only `slug`, `name`, `description`, `defaultSeverity`, `enabled`
- `checkCount`, `syncSupported` (boolean)
