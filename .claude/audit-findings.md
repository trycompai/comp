# Production Readiness Audit Findings

## Status: ALL HIGH-PRIORITY FIXES COMPLETE

## CONSOLIDATED HIGH-PRIORITY FIXES

### FIX-1: useAction migrations (8 instances)
- vendors/secondary-fields/update-secondary-fields-form.tsx
- people/[employeeId]/components/EmployeeDetails.tsx
- policies/[policyId]/components/PdfViewer.tsx (x3)
- settings/portal/portal-settings.tsx (x4)

### FIX-2: Missing credentials: 'include' (6 instances)
- vendors/components/create-vendor-form.tsx
- people/devices/components/PolicyImagePreview.tsx
- tasks/automation/hooks/use-task-automation-execution.ts
- tasks/automation/components/model-selector/use-available-models.tsx
- integrations/components/PlatformIntegrations.tsx
- questionnaire/hooks/useQuestionnaireParse.ts

### FIX-3: RBAC gaps (3 instances)
- controls/[controlId]/components/ControlDeleteDialog.tsx — missing usePermissions
- components/forms/risks/task/update-task-form.tsx — missing usePermissions
- settings/portal/portal-settings.tsx — missing usePermissions on mutations

### FIX-4: @db in client components (4 SOA files)
- questionnaire/soa/components/SubmitApprovalDialog.tsx
- questionnaire/soa/components/SOADocumentInfo.tsx
- questionnaire/soa/components/SOAPendingApprovalAlert.tsx
- questionnaire/soa/components/SOAFrameworkTable.tsx

### FIX-5: Type safety
- components/task-items/TaskItems.tsx — 2x `as any`, missing Array.isArray

### FIX-6: Manual role parsing (5 files)
- auditor/page.tsx, layout.tsx, TeamMembersClient.tsx, MemberRow.tsx, MultiRoleCombobox.tsx

### DEFERRED (medium priority — DS migration + tests)
- ~100+ lucide-react icon imports
- ~200+ @comp/ui imports
- ~57 missing test files for usePermissions components

---

## VENDORS + PEOPLE (complete)

### HIGH
- [ ] HOOKS: `useAction` in `vendors/[vendorId]/components/secondary-fields/update-secondary-fields-form.tsx` (L13,29)
- [ ] HOOKS: `useAction` in `people/[employeeId]/components/EmployeeDetails.tsx` (L22,58)
- [ ] HOOKS: Missing `credentials: 'include'` in `vendors/components/create-vendor-form.tsx` (L66)
- [ ] HOOKS: Missing `credentials: 'include'` in `people/devices/components/PolicyImagePreview.tsx` (L6)
- [ ] HOOKS: Direct `@db` in `vendors/backup-overview/components/charts/vendors-by-status.tsx` (L2)
- [ ] HOOKS: Direct `@db` in `vendors/backup-overview/components/charts/vendors-by-category.tsx` (L2)
- [ ] HOOKS: Direct `@db` in `people/page.tsx` (L5)
- [ ] HOOKS: Direct `@db` in `people/dashboard/components/EmployeesOverview.tsx` (L3-4)
- [ ] HOOKS: Direct `@db` in `people/all/components/TeamMembers.tsx` (L6)

### MEDIUM
- [ ] DS: 22 lucide-react icon imports across vendors + people
- [ ] TESTS: Missing tests for 10 usePermissions components (VendorsTable, InherentRiskForm, ResidualRiskForm, VendorResidualRiskChart, VendorInherentRiskChart, create-vendor-task-form, VendorPageClient, DeviceDropdownMenu, EmployeeDetails)
- [ ] DS: Multiple @comp/ui imports that could use DS

---

## CONTROLS + POLICIES (complete)

### HIGH
- [ ] HOOKS: `useAction` x3 in `policies/[policyId]/components/PdfViewer.tsx` (L31,73,99,112) — getPolicyPdfUrl, upload, delete
- [ ] RBAC: Manual role parsing in `policies/[policyId]/page.tsx` (L75-76) — `role.includes('employee')`
- [ ] RBAC: Missing permission check on `controls/[controlId]/components/ControlDeleteDialog.tsx` (L75-76) — no usePermissions

### MEDIUM
- [ ] DS: 11 files with lucide-react icons (controls + policies)
- [ ] DS: 6+ files with @comp/ui imports (Button, Dialog, Dropdown, Badge)
- [ ] DS: 3 Badge components with className that DS doesn't support
- [ ] TESTS: Missing tests for 8 usePermissions components (UpdatePolicyOverview, PublishVersionDialog, PolicyPageTabs, PolicyVersionsTab, PolicyAlerts, PolicyArchiveSheet, PolicyControlMappings, PolicyDetails, PolicyDeleteDialog)
## TASKS + RISK (complete)

### HIGH
- [ ] HOOKS: Missing `credentials: 'include'` in `tasks/[taskId]/automation/[automationId]/hooks/use-task-automation-execution.ts` (L56)
- [ ] HOOKS: Missing `credentials: 'include'` in `tasks/[taskId]/automation/[automationId]/components/model-selector/use-available-models.tsx` (L27)

### MEDIUM
- [ ] TESTS: Missing tests for 6 usePermissions components (FindingsList, BrowserAutomationsList, CreateFindingSheet, SingleTask, RiskPageClient, RisksTable)
- [ ] DS: 40+ lucide-react icon imports across tasks + risk
- [ ] DS: 70+ @comp/ui imports that could use DS

### CLEAN
- RBAC: All mutation elements properly gated
- No useAction usage
- No @db in client components (type-only)
- Array.isArray checks present
## FRAMEWORKS + INTEGRATIONS (complete)

### HIGH
- [ ] HOOKS: Missing `credentials: 'include'` in `integrations/components/PlatformIntegrations.tsx` (L294)

### MEDIUM
- [ ] DS: 11 files with lucide-react icons
- [ ] TESTS: Missing tests for 3 usePermissions components (AddFrameworkModal, ToDoOverview, FrameworkDeleteDialog, PlatformIntegrations)

### CLEAN
- RBAC: All mutation elements properly gated
- No useAction, no @db in client components
- No apiClient 3rd arg issues
## QUESTIONNAIRE + SETTINGS (complete)

### HIGH
- [ ] HOOKS: `useAction` x4 in `settings/portal/portal-settings.tsx` (L24,29,34,39) — deviceAgent, securityTraining, whistleblower, accessRequestForm
- [ ] RBAC: Missing usePermissions on `settings/portal/portal-settings.tsx` mutations
- [ ] HOOKS: Missing `credentials: 'include'` in `questionnaire/hooks/useQuestionnaireParse.ts` (L45)
- [ ] HOOKS: `@db` import (non-type) in 4 client components: `questionnaire/soa/components/SubmitApprovalDialog.tsx`, `SOADocumentInfo.tsx`, `SOAPendingApprovalAlert.tsx`, `SOAFrameworkTable.tsx`

### MEDIUM
- [ ] HOOKS: Direct `@db` in `settings/page.tsx` and `settings/portal/page.tsx` (server components, should use serverApi)
- [ ] TESTS: Missing tests for 12 usePermissions components (2 questionnaire + 10 settings)
- [ ] DS: 83 @comp/ui imports across questionnaire + settings
- [ ] DS: 31 lucide-react icon imports
- [ ] STYLE: `AdditionalDocumentsSection.tsx` exceeds 300 lines (447)
## SHARED COMPONENTS + HOOKS (complete)

### HIGH
- [ ] RBAC: Missing usePermissions on `components/forms/risks/task/update-task-form.tsx` — no permission gate on task mutation form
- [ ] TYPE: 2x `as any` casts in `components/task-items/TaskItems.tsx` (L97,99)
- [ ] HOOKS: Missing `Array.isArray()` on members in `components/task-items/TaskItems.tsx` (L74)

### MEDIUM
- [ ] DS: 10 files with lucide-react icons in components/
- [ ] TESTS: Missing tests for 8 usePermissions components (transfer-ownership, update-org-advanced-mode, update-org-evidence-approval, update-org-logo, create-new-policy, update-policy-form, TaskItemFocusView, TaskItemsHeader)
## API ROUTES + ACTIONS (complete)

### HIGH
- [ ] HOOKS: Missing `credentials: 'include'` in `app/api/training/certificate/route.ts` (L68)
- [ ] SECURITY: `app/api/user-frameworks/route.ts` — weak string comparison for SECRET_KEY, no rate limiting
- [ ] SECURITY: `app/api/frameworks/route.ts` — no authentication on GET endpoint
- [ ] SECURITY: QA/Retool endpoints use plain string comparison (not timing-safe) for secrets

### MEDIUM
- [ ] SECURITY: Hardcoded test password `Test123456!` in `auth/test-login/route.ts` (L50)
- [ ] SECURITY: Test endpoints return raw error details
## AUDITOR + LAYOUT + MISC (complete)

### HIGH
- [ ] TESTS: Missing tests for 10 usePermissions components in trust portal (TrustSettingsClient, TrustPortalSwitch, TrustPortalCustomLinks, TrustPortalFaqBuilder, TrustPortalAdditionalDocumentsSection, BrandSettings, TrustPortalDomain, AllowedDomainsManager, TrustPortalOverview, TrustPortalVendors)

### MEDIUM
- [ ] RBAC: Manual role parsing in 5 files (auditor/page.tsx, layout.tsx, TeamMembersClient.tsx, MemberRow.tsx, MultiRoleCombobox.tsx) — should centralize via permissions lib
- [ ] DS: 4 files with lucide-react icons (AuditorView, TrustPortalSwitch, TrustPortalCustomLinks, AppShellRailNav)
- [ ] DS: 9 files mixing @comp/ui with DS in trust portal settings
- [ ] HOOKS: Server action in `trust/portal-settings/actions/check-dns-record.ts` bypasses audit logs
