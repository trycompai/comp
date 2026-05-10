import { QUESTIONNAIRE_OPERATION_METADATA } from './questionnaire-metadata';
import type { PublicOperationMetadata } from './types';
import { WORKFLOW_OPERATION_METADATA } from './workflow-operation-metadata';

const CORE_OPERATION_METADATA: Record<string, PublicOperationMetadata> = {
  OrganizationController_getOrganization_v1: {
    summary: 'Get organization profile',
    description:
      'Retrieve organization profile data used to personalize compliance workflows, Trust Center branding, API automation, and audit readiness reporting.',
    codeSamples: [
      {
        lang: 'bash',
        label: 'Get organization profile',
        source:
          'curl --request GET --url "https://api.trycomp.ai/v1/organization" --header "X-API-Key: $COMP_AI_API_KEY"',
      },
    ],
  },
  OrganizationController_listApiKeys_v1: {
    summary: 'List API keys',
    description:
      'List active API keys for an organization so administrators can audit automation access and rotate credentials safely.',
  },
  OrganizationController_createApiKey_v1: {
    summary: 'Create API key',
    description:
      'Create a scoped API key for server-side compliance automation such as evidence sync, policy workflows, or security questionnaire tooling.',
  },
  OrganizationController_getAvailableScopes_v1: {
    summary: 'List API key scopes',
    description:
      'Retrieve available API key scopes and permissions before creating credentials for a specific compliance automation workflow.',
  },
  OrganizationController_revokeApiKey_v1: {
    summary: 'Revoke API key',
    description:
      'Revoke an organization API key when an integration is retired, credentials rotate, or access should be removed.',
  },
  PoliciesController_getAllPolicies_v1: {
    summary: 'List compliance policies',
    description:
      'List compliance policies for an organization, including drafts and published policies used for SOC 2, ISO 27001, HIPAA, and GDPR workflows.',
    codeSamples: [
      {
        lang: 'bash',
        label: 'List policies',
        source:
          'curl --request GET --url "https://api.trycomp.ai/v1/policies" --header "X-API-Key: $COMP_AI_API_KEY"',
      },
    ],
  },
  PoliciesController_createPolicy_v1: {
    summary: 'Create compliance policy',
    description:
      'Create a policy record that can be reviewed, versioned, published, linked to controls, and used as source evidence for questionnaires.',
  },
  PoliciesController_publishAllPolicies_v1: {
    summary: 'Publish all draft policies',
    description:
      'Publish draft policies in bulk so approved policy content can power Trust Center sharing, questionnaire answers, and audit evidence.',
  },
  PoliciesController_downloadAllPolicies_v1: {
    summary: 'Download all published policies',
    description:
      'Generate a single PDF bundle of published compliance policies for auditors, customer security reviews, and Trust Center workflows.',
  },
  PoliciesController_regeneratePolicy_v1: {
    summary: 'Regenerate policy with AI',
    description:
      'Regenerate policy content using Comp AI while keeping the result reviewable before it is published or used as compliance evidence.',
  },
  PoliciesController_aiChatPolicy_v1: {
    summary: 'Chat with AI about a policy',
    description:
      'Ask policy-specific questions and request draft improvements while preserving human review before policy changes are applied.',
  },
  KnowledgeBaseController_listDocuments_v1: {
    summary: 'List knowledge base documents',
    description:
      'List uploaded knowledge base documents that Comp AI can use as approved source material for answers, policies, and reviews.',
  },
  KnowledgeBaseController_uploadDocument_v1: {
    summary: 'Upload knowledge base document',
    description:
      'Upload supporting documentation so Comp AI can process approved source material for questionnaire answers and policy workflows.',
  },
  KnowledgeBaseController_processDocuments_v1: {
    summary: 'Process knowledge base documents',
    description:
      'Start document processing so uploaded knowledge base files become searchable source material for AI-assisted compliance workflows.',
  },
  KnowledgeBaseController_saveManualAnswer_v1: {
    summary: 'Save reusable manual answer',
    description:
      'Save or update a reusable manual answer for security questionnaires that need approved, consistent response language.',
  },
  TasksController_getTasks_v1: {
    summary: 'List compliance tasks',
    description:
      'List compliance tasks with assignments and status so teams can track audit readiness, evidence work, and control implementation.',
    codeSamples: [
      {
        lang: 'bash',
        label: 'List tasks',
        source:
          'curl --request GET --url "https://api.trycomp.ai/v1/tasks" --header "X-API-Key: $COMP_AI_API_KEY"',
      },
    ],
  },
  TasksController_createTask_v1: {
    summary: 'Create compliance task',
    description:
      'Create a compliance task for evidence collection, remediation, review, or recurring control work inside an organization.',
  },
  TasksController_uploadTaskAttachment_v1: {
    summary: 'Upload task evidence',
    description:
      'Upload an evidence attachment to a task so auditors and reviewers can trace completion back to source documentation.',
  },
  EvidenceExportController_exportTaskEvidenceZip_v1: {
    summary: 'Export task evidence as ZIP',
    description:
      'Download a ZIP package containing task evidence and automation results for auditor review or customer security requests.',
  },
  AutomationsController_createAutomation_v1: {
    summary: 'Create evidence automation',
    description:
      'Create an automated evidence workflow attached to a task so Comp AI can collect recurring proof from connected systems.',
  },
  TrustAccessController_createAccessRequest_v1: {
    summary: 'Submit Trust Access request',
    description:
      'Submit an external Trust Center access request with requester details, company context, and review reason for administrator approval.',
  },
  TrustAccessController_approveRequest_v1: {
    summary: 'Approve Trust Access request',
    description:
      'Approve a Trust Center access request, configure the grant window, and start the NDA or access email workflow.',
  },
  TrustAccessController_signNda_v1: {
    summary: 'Sign Trust Access NDA',
    description:
      'Submit a digital NDA signature for a Trust Access token so the requester can receive time-limited access to shared resources.',
  },
  TrustAccessController_getGrantByAccessToken_v1: {
    summary: 'Get Trust Access grant',
    description:
      'Retrieve grant details for a Trust Access token before showing token-scoped policies, documents, questionnaires, and resources.',
  },
  TrustAccessController_getPoliciesByAccessToken_v1: {
    summary: 'List Trust Access policies',
    description:
      'List published policies available to an external reviewer through a valid Trust Access token.',
  },
  TrustAccessController_downloadAllPolicies_v1: {
    summary: 'Download Trust Access policy bundle',
    description:
      'Generate a watermarked PDF bundle of policies available through a Trust Access token for customer security review.',
  },
  TrustPortalController_getSettings_v1: {
    summary: 'Get Trust Center settings',
    description:
      'Retrieve Trust Center settings used to configure public status, custom domains, framework visibility, resources, FAQs, and access rules.',
  },
  TrustPortalController_uploadComplianceResource_v1: {
    summary: 'Upload compliance certificate',
    description:
      'Upload or replace a compliance certificate PDF such as SOC 2, ISO 27001, HIPAA, or GDPR evidence for Trust Center sharing.',
  },
  TrustPortalController_updateOverview_v1: {
    summary: 'Update Trust Center overview',
    description:
      'Update the public Trust Center overview content that explains security posture and compliance status to prospects and customers.',
  },
  ConnectionsController_listProviders_v1: {
    summary: 'List integration providers',
    description:
      'List available integration providers that can connect to the organization for automated evidence collection and compliance checks.',
  },
  ConnectionsController_createConnection_v1: {
    summary: 'Create integration connection',
    description:
      'Create an integration connection so Comp AI can collect evidence, run checks, or sync data from a connected provider.',
  },
  ChecksController_runConnectionChecks_v1: {
    summary: 'Run integration checks',
    description:
      'Run all compliance checks for an integration connection and capture results as automated evidence.',
  },
  CloudSecurityController_scan_v1: {
    summary: 'Run cloud security scan',
    description:
      'Trigger a cloud security scan for a connected AWS, Azure, or GCP account and collect findings for compliance remediation.',
  },
  CloudSecurityController_getFindings_v1: {
    summary: 'List cloud security findings',
    description:
      'List cloud security findings discovered by scans so teams can prioritize remediation before issues become audit findings.',
  },
  RemediationController_preview_v1: {
    summary: 'Preview cloud remediation',
    description:
      'Preview a cloud remediation action before execution so teams can review the intended change and affected resources.',
  },
  DeviceAgentController_registerDevice_v1: {
    summary: 'Register device agent',
    description:
      'Register a Comp AI Device Agent installation so employee endpoint checks can report into compliance tasks and device inventory.',
  },
  DeviceAgentController_checkIn_v1: {
    summary: 'Submit device compliance check-in',
    description:
      'Submit device security check results for encryption, antivirus, password policy, screen lock, and other endpoint controls.',
  },
  SecurityPenetrationTestsController_create_v1: {
    summary: 'Create penetration test',
    description:
      'Create an AI-powered penetration test run for an approved target and track the resulting findings and report artifacts.',
  },
  VendorsController_triggerAssessment_v1: {
    summary: 'Trigger vendor risk assessment',
    description:
      'Trigger a vendor risk assessment so Comp AI can update third-party risk evidence and vendor security review status.',
  },
  RisksController_createRisk_v1: {
    summary: 'Create organization risk',
    description:
      'Create a risk record with ownership and context so compliance teams can track mitigation and remediation work.',
  },
};

export const PUBLIC_OPERATION_METADATA: Record<
  string,
  PublicOperationMetadata
> = {
  ...CORE_OPERATION_METADATA,
  ...WORKFLOW_OPERATION_METADATA,
  ...QUESTIONNAIRE_OPERATION_METADATA,
};
