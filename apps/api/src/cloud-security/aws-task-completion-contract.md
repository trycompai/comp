# AWS scan and task completion

A passing AWS service scan is one input to automatic task completion. It cannot
override an enabled custom collector's failed, missing, unfinished or unbound
evaluation, a manual task, an archived task, a review in progress, or an assigned
approver when evidence approval is enabled. Existing manual update and approval
endpoints retain their own permissions and behavior.

The automatic path requires a completed successful custom run with a passing
evaluation for the current published version. Its exact
`evaluationCriteriaSnapshot` must equal the definition's current criteria. The
execution must start after the version's last update; no new elapsed-time
freshness threshold is introduced. The conditional database write rechecks the
task/review state, enabled collectors, criteria, version and latest-run snapshot.

## Private evaluator integration

The public Community Edition delegates custom execution to
`POST /api/tasks-automations/trigger/execute` and polling to
`GET /api/tasks-automations/runs/:id` through `callEnterpriseApi`. It does not
contain the custom evaluator or any `EvidenceAutomationRun` result writer.
Browser-automation writers use a different model and cannot populate this field.

The managed-service owner must:

1. Review and apply the nullable-column migration through the normal approved
   database release. This source change does not apply it to a live database.
2. Capture the exact criteria supplied to the actual custom evaluator. Persist
   that value as `EvidenceAutomationRun.evaluationCriteriaSnapshot` atomically
   with that run's `evaluationStatus` and evaluation result. Do not copy criteria
   from a later definition, polling request or client-supplied completion claim.
3. Preserve the executed published version and its start/completion timestamps.
   Verify passing, failing and interrupted evaluations, changed criteria/source,
   review transitions and missing historical snapshots before enabling the new
   automatic-completion code in the managed service.

Historical records remain `NULL` and cannot qualify automatically. There is no
backfill, synthetic pass, automatic human approval, or task-status reset. Until
the private writer is ported, custom runs without the new binding remain
ineligible; manual review remains available through its existing authorized path.

The existing AWS service mapping and scanned-service eligibility are retained.
This change does not establish full account/region/resource coverage or prove
that a compliance control operates effectively.
