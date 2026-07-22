---
name: security-review
description: Check code for the most common, high-risk security vulnerabilities (broken access control, tenant isolation, injection, secrets, SSRF, auth/session, unsafe file handling, mass assignment) before it ships. Use after editing any API controller, guard, or auth code (apps/api/src/auth/**), a Prisma schema/query, a file-upload/webhook handler, or before committing/pushing security-sensitive changes.
---

Review code for high-risk security vulnerabilities and **fix confirmed high-severity issues immediately**. Complements CI (CodeQL/Dependabot/SBOM) by catching logic/design flaws those miss — do not re-flag dependency CVEs or generic lint.

## 1. Scope

- If `$ARGUMENTS` names files/dirs, review those.
- Otherwise review the current change set: `git diff --name-only origin/main...HEAD` (fall back to `git diff --name-only` for uncommitted work). Skip generated files, lockfiles, and `*.spec.ts` (unless the change is in a spec).

**Review whenever the change touches a trust boundary or a resource — judge by behavior, not path.** That includes: any controller **or service** (services are where IDOR, tenant-scoping, and mass-assignment bugs actually live), Next.js route handlers (`app/api/**`, `route.ts`), Trigger.dev jobs (`apps/api/src/trigger/**` — SSRF, elevated context), guards/auth (`apps/api/src/auth/**`, `packages/auth/**`), any Prisma query (especially lookups/updates/deletes by a client-supplied id → IDOR), middleware, file upload/storage, webhooks, outbound requests to a dynamic URL, crypto/token handling, and any frontend that renders user-supplied HTML or builds redirects from input.

Only if the change is genuinely non-security (pure presentation, types, copy, config with no secrets) — say so and stop, don't invent findings.

## 2. Review

Dispatch the **`security-reviewer`** agent on the scoped files. For a broad review (a full PR / many files), fan out **parallel** `security-reviewer` agents by dimension group so coverage is thorough:
- **Access control & tenancy** — guards, `@RequirePermission`, API-key/service-token scope enforcement, authz-vs-attribution, IDOR, `organizationId` scoping.
- **Injection, XSS & mass assignment** — raw Prisma/SQL, command/path injection, `dangerouslySetInnerHTML`/unsanitized HTML, `...dto` spread into `create/update`.
- **Secrets, SSRF, auth/session & file handling** — hardcoded/logged secrets, outbound fetch to user URLs, session/cookie/attribution boundaries, S3/upload safety, DoS, info disclosure.

The agent's full checklist lives in `.claude/agents/security-reviewer.md`.

## 3. Verify (no false positives)

For each `P1`/`P2` finding, adversarially verify before acting: dispatch one `security-reviewer` (or read the code yourself) prompted to **refute** it — trace the guard→controller→service→DB path. Drop anything that can't be confirmed. Attribution-only use of a resolved actor, org-scoped queries, and parameterized Prisma are NOT findings.

## 4. Fix & report

- **Fix** confirmed `P1`/`P2` issues immediately (mirror the surrounding code; add a regression test for auth/attribution changes).
- **Report** `P3`s and anything needing a product decision, with `severity · file:line · exploit/impact · fix`.
- Run `bunx turbo run typecheck --filter=@trycompai/api --filter=@trycompai/app` after fixes.
- End with a one-line verdict: clean, or the highest-priority action remaining.
