-- Run this AFTER your first user completes the /setup wizard, IF Trigger.dev
-- task workers are not deployed (which is the default in this branch — see
-- SELFHOST.md "Trigger.dev workers" section).
--
-- During onboarding the api dispatches a `onboard-organization` task to
-- Trigger.dev. With no workers, the task queues forever, the Onboarding row
-- stays with triggerJobCompleted=false, and the dashboard shows
-- "Setup needs attention. Something went wrong while tailoring your environment."
--
-- The good news: `initializeOrganization` runs SYNCHRONOUSLY during onboarding
-- and clones framework templates → Control / Policy / Task rows for the org.
-- So the dashboard has real data — you just need to clear the warning.
--
-- The trade-off: the Trigger task does AI policy text rewriting, AI risk
-- generation, vendor research scraping. Those layers WON'T be filled in until
-- workers run. Manually click "Generate" on policies/risks/vendors as needed.
--
-- Usage:
--   docker compose exec -T db psql -U comp -d comp \
--     -v ORG_ID="'org_xxxxxxxxxxx'" -f selfhost/post-onboarding.sql
--
-- Or just edit the WHERE clause and pipe the file in directly.

\set ON_ERROR_STOP on

UPDATE "Onboarding"
SET "triggerJobCompleted" = true,
    "triggerJobId" = NULL,
    policies = true,
    employees = true,
    vendors = true,
    integrations = true,
    risk = true,
    team = true,
    tasks = true,
    "callBooked" = true
WHERE "organizationId" = :ORG_ID;

SELECT "organizationId",
       "triggerJobCompleted",
       policies, vendors, risk, tasks
FROM "Onboarding"
WHERE "organizationId" = :ORG_ID;
