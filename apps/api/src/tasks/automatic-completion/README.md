# Automatic task completion

`completeTaskAutomatically` is the common gate for native manual checks,
scheduled checks, browser completion and disconnect reconciliation. AWS shared
scans use `completeAdmittedTask` after selecting eligible task templates from
stored results. Explicit manual task decisions and approval APIs are unchanged.

An automatic decision requires the current automated, nonarchived task state,
its configured approval policy, and every enabled custom collector's current
published version and exact evaluated criteria. A historical run without its
criteria snapshot is unknown. Collection success alone is insufficient.

For configured native checks, inventory includes each connection/check pair.
The latest actual attempt is used, including pending, errored and inconclusive
attempts hidden from display history. A complete result set and current active
finding exceptions are required. Parent/result and dynamic-definition locks
protect completeness; the final conditional task write rechecks task, review,
connection, definition, credentials, exceptions and latest-run predicates.

## Run provenance

`IntegrationCheckRun.completionEvidenceBinding` is nullable. Existing rows stay
`NULL`; the migration does not backfill evidence or change task states. Native
writers retain only the binding returned by the executing `runCheck` runtime.
The digest binds the actual build identity, connection/task/check, variables,
configuration metadata, selected opaque credential revision, and dynamic
definition/manifest where applicable. Credential values are not persisted in
this binding. A delegated caller must not stamp its own identity on a response.

The API's credential selector returns the revision of the record actually
decrypted. A rotation or scope/source change makes old evidence ineligible.
Source identity must come from the actual complete-checkout build; see
[`NATIVE_COMPLETION_SOURCE.md`](../../../../../packages/integration-platform/NATIVE_COMPLETION_SOURCE.md).
Incomplete API Docker contexts and unavailable private runtime identities remain
unknown until their owner provides the verified complete-input build contract.

## Shared AWS scans

The producer registers a task-agnostic pending run before provider execution,
captures the actual invocation inputs and credential revision, then atomically
stores its bound outcome and results. Completion receives only its stored run
reference. It derives service eligibility from locked stored rows and checks
every configured AWS account, preserving explicit paused/disconnected account
exclusions. A failed, missing, unbound or newer pending account scan prevents
completion. Native per-task manifest-check disable semantics remain unchanged;
they do not invent an exclusion from the separate organization-scoped scan.

The existing service mappings and scanned-service eligibility remain intact.
This does not establish complete region/resource coverage, effective operation
of a control, a human approval, or a deployed private Cloud correction.

## Qualification and release

The mandatory security workflow runs the integration-platform source/binding
suite and all affected API caller and PostgreSQL race regressions. Local SQL
tests require the owned disposable Unix-socket fixture; CI uses its dedicated
synthetic `comp_security_tests` database. Tests never run integrations or change
live tasks. Nullable schema migrations require normal release review and are
not applied by source qualification.

The private custom evaluator must also persist the exact criteria it evaluated
atomically with its outcome, as described in
[`aws-task-completion-contract.md`](../../cloud-security/aws-task-completion-contract.md).
Missing private-writer support, historical bindings and partial build inputs
remain ineligible; no pass or history is fabricated to enable completion.
