import { schedules } from '@trigger.dev/sdk';

// Static imports guarantee every task + schedule registers with the local
// in-process @trigger.dev shim inside the Next.js server bundle (the bundler
// cannot enumerate the trigger directory at runtime, so imports are explicit).
import './lib/prompts';
import './lib/research';
import './lib/send-email-via-api';

import './tasks/auditor/generate-auditor-content-prompts';
import './tasks/auditor/generate-auditor-content';

import './tasks/cloud-security/api-response';
import './tasks/cloud-security/execute-result';
import './tasks/cloud-security/remediate-batch-helpers';
import './tasks/cloud-security/remediate-batch';
import './tasks/cloud-security/remediate-preview';
import './tasks/cloud-security/remediate-single';
import './tasks/cloud-security/retry-preview';

import './tasks/device/create-fleet-label-for-all-orgs';
import './tasks/device/create-fleet-label-for-org';
import './tasks/device/flag-stale-devices';

import './tasks/email/new-policy-email';
import './tasks/email/publish-all-policies-email';
import './tasks/email/weekly-task-digest-email';

import './tasks/integration/integration-results';
import './tasks/integration/integration-schedule';
import './tasks/integration/run-integration-tests';

import './tasks/onboarding/backfill-executive-context-all-orgs';
import './tasks/onboarding/backfill-executive-context-single-org';
import './tasks/onboarding/backfill-training-videos-for-all-orgs';
import './tasks/onboarding/backfill-training-videos-for-org';
import './tasks/onboarding/build-citations-heading';
import './tasks/onboarding/generate-full-policies';
import './tasks/onboarding/generate-risk-mitigation';
import './tasks/onboarding/generate-vendor-mitigation';
import './tasks/onboarding/initialize-organization';
import './tasks/onboarding/link-risks-and-vendors-to-work';
import './tasks/onboarding/onboard-organization-helpers';
import './tasks/onboarding/onboard-organization';
import './tasks/onboarding/process-policy-template';
import './tasks/onboarding/select-mitigation-citations';
import './tasks/onboarding/update-policies-helpers';
import './tasks/onboarding/update-policy';

import './tasks/scrape/research';
import './tasks/scrape/score-vendor-risk';

import './tasks/task/policy-acknowledgment-digest-helpers';
import './tasks/task/policy-acknowledgment-digest';
import './tasks/task/policy-schedule';
import './tasks/task/task-schedule-helpers';
import './tasks/task/task-schedule';
import './tasks/task/weekly-task-reminder';

let initialized = false;

export function initLocalTriggerRuntime(): void {
  if (initialized) return;
  initialized = true;
  schedules.start();
}
