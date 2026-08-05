-- ============================================================================
-- Row-Level Security (RLS) — Phase 1: core tenant tables
-- ============================================================================
--
-- Goal: defense-in-depth multi-tenancy at the database layer. A non-superuser
-- application role (`comp_app`) can only see rows whose `organizationId` matches
-- the tenant set in the `app.tenant_id` GUC. System/background/auth access runs
-- as `comp_service` (BYPASSRLS) so better-auth, schedulers and the trigger shim
-- keep working without a tenant context.
--
-- Important caveats (intentional for this phase):
--   * Roles are created with dev-only passwords below. Rotate these via
--     `ALTER ROLE ... PASSWORD` in real environments; the app connects with
--     DATABASE_URL_TENANT / DATABASE_URL_SERVICE.
--   * Tables remain owned by `postgres` (superuser). We deliberately do NOT
--     use FORCE ROW LEVEL SECURITY, so migrations/backfills run as `postgres`
--     keep full access. `comp_app` is a non-owner so RLS applies to it.
--   * Tables WITHOUT a direct `organizationId` column (relation-only scoping,
--     e.g. PolicyVersion, FrameworkControl*, Isms* sub-tables, VendorContact)
--     are NOT covered yet — they are still reachable cross-tenant via
--     `comp_app` and must be added in a later phase.
-- ============================================================================

-- 1. Roles -----------------------------------------------------------------
-- comp_app:     non-superuser application role. Subject to RLS policies.
-- comp_service: BYPASSRLS role for system/background/auth access. Granting
--               membership to comp_app lets tenant code `SET ROLE comp_service`
--               to run scoped-out operations on demand.
CREATE ROLE comp_app WITH LOGIN PASSWORD 'comp_app_local_dev_password';
CREATE ROLE comp_service WITH LOGIN BYPASSRLS PASSWORD 'comp_service_local_dev_password';
GRANT comp_service TO comp_app;

-- 2. Tenant context (GUC) ---------------------------------------------------
-- The current tenant is the value of the `app.tenant_id` GUC. It is set per
-- transaction via `set_config('app.tenant_id', ..., true)` (equivalent to
-- `SET LOCAL "app.tenant_id" = ...`). Returns NULL when not scoped, which makes
-- every tenant policy fail closed (no rows visible).
CREATE OR REPLACE FUNCTION public.app_current_tenant()
RETURNS text
LANGUAGE sql
STABLE
AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '') $$;

COMMENT ON FUNCTION public.app_current_tenant()
IS 'Current organization id from the app.tenant_id GUC. NULL when not scoped.';

-- 3. Grants ----------------------------------------------------------------
-- Both roles get blanket DML on public tables/sequences. RLS decides which
-- rows `comp_app` may actually touch; `comp_service` bypasses via BYPASSRLS.
GRANT USAGE ON SCHEMA public TO comp_app, comp_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO comp_app, comp_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO comp_app, comp_service;

-- Tables/sequences created by future migrations (run as postgres) should keep
-- the same grants so the roles don't silently lose access.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO comp_app, comp_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO comp_app, comp_service;

-- 4. RLS policies -----------------------------------------------------------
-- Every tenant table gets a single `tenant_isolation` policy: a row is visible
-- and writable only when its organization column equals the current tenant.
-- NULL/absent tenant context yields NULL = false, so access is denied.
--
-- Organization is special: the tenant row itself is the current org id.

ALTER TABLE public."Organization" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Organization"
  USING (id = public.app_current_tenant())
  WITH CHECK (id = public.app_current_tenant());

-- Tables keyed on "organizationId" (camelCase column) -----------------------

ALTER TABLE public."ApiKey" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."ApiKey"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Attachment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Attachment"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."AuditLog"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."BrowserAuthProfile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."BrowserAuthProfile"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."BrowserbaseContext" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."BrowserbaseContext"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."CheckDefinition" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."CheckDefinition"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Comment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Comment"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Context" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Context"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Control" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Control"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."CustomFramework" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."CustomFramework"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."CustomRequirement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."CustomRequirement"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Device" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Device"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."EvidenceFormSetting" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."EvidenceFormSetting"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."EvidenceSubmission" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."EvidenceSubmission"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Finding" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Finding"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."FindingException" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."FindingException"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."FindingRegression" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."FindingRegression"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."FindingResolution" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."FindingResolution"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."FleetPolicyResult" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."FleetPolicyResult"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."FrameworkInstance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."FrameworkInstance"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Integration" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Integration"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."IntegrationConnection" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."IntegrationConnection"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."IntegrationOAuthApp" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."IntegrationOAuthApp"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."IntegrationOAuthError" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."IntegrationOAuthError"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."IntegrationOAuthState" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."IntegrationOAuthState"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."IntegrationResult" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."IntegrationResult"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."IntegrationSyncLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."IntegrationSyncLog"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Invitation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Invitation"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."IsmsDocument" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."IsmsDocument"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."IsmsProfile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."IsmsProfile"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."KnowledgeBaseDocument" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."KnowledgeBaseDocument"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Member" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Member"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."OffboardingAccessRevocation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."OffboardingAccessRevocation"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."OffboardingChecklistCompletion" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."OffboardingChecklistCompletion"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."OffboardingChecklistTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."OffboardingChecklistTemplate"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Onboarding" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Onboarding"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."OrganizationChart" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."OrganizationChart"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Policy" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Policy"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Questionnaire" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Questionnaire"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."RemediationAction" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."RemediationAction"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."RemediationBatch" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."RemediationBatch"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Risk" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Risk"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."RiskAcceptance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."RiskAcceptance"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."SOADocument" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."SOADocument"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."SecurityQuestionnaireManualAnswer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."SecurityQuestionnaireManualAnswer"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Task" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Task"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."TaskItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."TaskItem"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."TimelineInstance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."TimelineInstance"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Trust" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Trust"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."TrustAccessRequest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."TrustAccessRequest"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."TrustCustomFramework" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."TrustCustomFramework"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."TrustCustomLink" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."TrustCustomLink"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."TrustDocument" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."TrustDocument"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."TrustNDAAgreement" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."TrustNDAAgreement"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."TrustResource" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."TrustResource"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."Vendor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."Vendor"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."mcp_org_binding" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."mcp_org_binding"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."organization_role" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."organization_role"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."role_notification_setting" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."role_notification_setting"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

ALTER TABLE public."background_check_requests" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."background_check_requests"
  USING ("organizationId" = public.app_current_tenant())
  WITH CHECK ("organizationId" = public.app_current_tenant());

-- Tables keyed on "organization_id" (snake_case @@map column) ---------------

ALTER TABLE public."billing_audit_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."billing_audit_events"
  USING (organization_id = public.app_current_tenant())
  WITH CHECK (organization_id = public.app_current_tenant());

ALTER TABLE public."billing_credit_balances" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."billing_credit_balances"
  USING (organization_id = public.app_current_tenant())
  WITH CHECK (organization_id = public.app_current_tenant());

ALTER TABLE public."billing_credit_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."billing_credit_events"
  USING (organization_id = public.app_current_tenant())
  WITH CHECK (organization_id = public.app_current_tenant());

ALTER TABLE public."billing_usage_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."billing_usage_events"
  USING (organization_id = public.app_current_tenant())
  WITH CHECK (organization_id = public.app_current_tenant());

ALTER TABLE public."organization_billing" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."organization_billing"
  USING (organization_id = public.app_current_tenant())
  WITH CHECK (organization_id = public.app_current_tenant());

ALTER TABLE public."organization_billing_subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."organization_billing_subscriptions"
  USING (organization_id = public.app_current_tenant())
  WITH CHECK (organization_id = public.app_current_tenant());

ALTER TABLE public."pentest_credits" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."pentest_credits"
  USING (organization_id = public.app_current_tenant())
  WITH CHECK (organization_id = public.app_current_tenant());

ALTER TABLE public."secrets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."secrets"
  USING (organization_id = public.app_current_tenant())
  WITH CHECK (organization_id = public.app_current_tenant());

ALTER TABLE public."security_penetration_test_finding_contexts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."security_penetration_test_finding_contexts"
  USING (organization_id = public.app_current_tenant())
  WITH CHECK (organization_id = public.app_current_tenant());

ALTER TABLE public."security_penetration_test_runs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public."security_penetration_test_runs"
  USING (organization_id = public.app_current_tenant())
  WITH CHECK (organization_id = public.app_current_tenant());
