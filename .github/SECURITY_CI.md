# Security checks for the maintained legacy repository

Production uses Comp v2. This public repository remains maintained, and the
`Security Regression` workflow runs deterministic security tests on pull requests
and pushes to `main`. It uses a read-only GitHub token, disables checkout credential
persistence, receives no repository secrets, and installs locked dependencies with
lifecycle scripts disabled. Prisma declarations are then generated explicitly
from the checked-in schema for the mocked API tests, without connecting to a
database. Tests fail the check when a regression is detected.

The broader `Security regressions` workflow retains the API, app, portal, email,
and MCP regressions from earlier security fixes, with pinned actions and Bun and
checkout credential persistence disabled. SDK maintenance publishing retains the
release-only guard and `legacy` npm tag, leaving `latest` to Comp v2.

The focused workflow also checks that active actions use immutable commit references,
streamed remote shell installers are absent, Bun matches the root package manager
version, and the retired workflows remain inactive. Dependabot updates GitHub
Actions references weekly. Configure `Security Regression` as a required check if
branch protection should enforce these tests; code changes cannot modify that
GitHub setting.

Two credential-bearing workflows are archived in `workflows_disabled/` with a
`.disabled` extension. GitHub does not discover them there:

- `gram-sync.yml.disabled`: a mutable installer controlled the CLI subsequently
  given a publishing API key. Step-scoping that key did not prevent persistence.
  The maintained legacy source no longer automatically publishes its OpenAPI spec
  to the production hosted MCP.
- `security-review.yml.disabled`: the Claude Code reviewer executed project hooks
  from PR contents while holding an API key and did not reliably fail its check
  for findings or analysis errors. Deterministic regression tests replace that CI
  review. Local developer review tools remain available.

Repository changes do not revoke previously configured credentials or investigate
past activity. A repository administrator should remove unused `GRAM_API_KEY` and
`ANTHROPIC_API_KEY` secrets from this repository, remove any obsolete required
`Security Review` check, and inspect workflow/API activity before deciding whether
credential rotation is needed. This change does not disable unrelated release,
deployment, or SDK workflows.

## Deploy credentials live in environments

Repository-level secrets are available to workflows on every branch. Every job that
deploys or publishes therefore runs
in a GitHub environment whose deployment-branch policy admits one protected branch,
and its credentials are stored as secrets of that environment:

| Environment  | Branch    | Secrets                                                                                                                              |
| ------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `Production` | `release` | `TRIGGER_API_ACCESS_TOKEN`, `TRIGGER_APP_ACCESS_TOKEN`, `SECRET_KEY`, `VERCEL_ACCESS_TOKEN`, `CHROME_WEB_STORE_SERVICE_ACCOUNT_JSON` |
| `staging`    | `main`    | `TRIGGER_API_ACCESS_TOKEN`, `TRIGGER_APP_ACCESS_TOKEN`, `SECRET_KEY`, `VERCEL_ACCESS_TOKEN`                                          |

Trigger.dev keys are scoped to one project and one environment, so the API and app
deploys each read their own key; the shared `TRIGGER_ACCESS_TOKEN` name is retired.

Declaring `environment:` on a job does not protect a repository-level copy of the same
secret: a branch workflow can omit it. The repository-level copies of the names above,
and of `TRIGGER_ACCESS_TOKEN`, must not exist. Deleting them is the step that closes
the path. The policy test below fails if a job reads one of these secrets outside
its environment.

Run the workflow policy checks locally with:

```sh
bun test ./.github/tests/security-ci.test.ts
```

See `workflows/security-regression.yml` for the exact API and app regression test
commands. Restoring an archived workflow requires a fresh review of credential
isolation, executable verification, and whether the legacy source should publish.
