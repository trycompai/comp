import { QUESTIONNAIRE_OPERATION_METADATA } from './questionnaire-metadata';
import { TRUST_OPERATION_METADATA } from './trust-operation-metadata';
import type { PublicOperationMetadata } from './types';
import { WORKFLOW_OPERATION_METADATA } from './workflow-operation-metadata';

const CORE_OPERATION_METADATA: Record<string, PublicOperationMetadata> = {
  AttachmentsController_getAttachmentDownloadUrl_v1: {
    summary: 'Get shared attachment download URL',
    description:
      'Generate a signed download URL for a shared attachment linked to comments, evidence records, or compliance workflow reviews.',
  },
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
  OrganizationController_getPrimaryColor_v1: {
    summary: 'Get organization brand color',
    description:
      'Retrieve the organization primary brand color used for Trust Center theming, portals, and API-driven embedded experiences.',
  },
  OrganizationController_revokeApiKey_v1: {
    summary: 'Revoke API key',
    description:
      'Revoke an organization API key when an integration is retired, credentials rotate, or access should be removed.',
  },
  PoliciesController_getAllPolicies_v1: {
    summary: 'List compliance policies',
    description:
      'Lists active compliance policies by default. Use includeArchived=true to include archived rows and excludeContent=true when you only need policy metadata.',
    codeSamples: [
      {
        lang: 'bash',
        label: 'List policies',
        source:
          'curl --request GET --url "https://api.trycomp.ai/v1/policies" --header "X-API-Key: $COMP_AI_API_KEY"',
      },
      {
        lang: 'bash',
        label: 'List policies (lightweight, no content)',
        source:
          'curl --request GET --url "https://api.trycomp.ai/v1/policies?excludeContent=true" --header "X-API-Key: $COMP_AI_API_KEY"',
      },
      {
        lang: 'bash',
        label: 'List policies including archived',
        source:
          'curl --request GET --url "https://api.trycomp.ai/v1/policies?includeArchived=true" --header "X-API-Key: $COMP_AI_API_KEY"',
      },
    ],
  },
  PoliciesController_createPolicy_v1: {
    summary: 'Create compliance policy',
    description:
      'Create a policy record that can be reviewed, versioned, published, linked to controls, and used as source evidence for questionnaires.',
  },
  PoliciesController_requestPolicyPdfUploadUrl_v1: {
    summary: 'Request a presigned URL to upload a policy PDF',
    description:
      'Generates a presigned S3 URL for uploading a policy PDF directly to storage. Use this when attaching a PDF to a compliance policy — the file bytes are uploaded straight to S3 without passing through the API. Requires the policy ID; if you only know the policy name, look it up first via the list-compliance-policies tool. After uploading the file to the returned URL, finalize the attachment by calling confirm-policy-pdf-uploaded with the same s3Key.',
  },
  PoliciesController_confirmPolicyPdfUploaded_v1: {
    summary: 'Confirm a policy PDF upload completed',
    description:
      'Links an uploaded PDF to a compliance policy after the file has been PUT to a presigned S3 URL. Call this after request-policy-pdf-upload-url returned an s3Key and you successfully uploaded the file bytes to that URL. The endpoint verifies the file exists in S3 before linking it to the policy or version.',
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
  PoliciesController_getPolicy_v1: {
    summary: 'Get compliance policy',
    description:
      'Retrieve a single compliance policy by its ID, including current content, draft content, review status, framework links, and audit metadata. Use this to read or inspect one policy in detail. If you only have a policy name, find its ID first by listing compliance policies.',
  },
  PoliciesController_updatePolicy_v1: {
    summary: 'Update compliance policy',
    description:
      'Update compliance policy details or content while keeping policy workflows connected to controls, tasks, and approvals.',
  },
  PoliciesController_deletePolicy_v1: {
    summary: 'Delete compliance policy',
    description:
      'Delete a compliance policy that is no longer part of the organization evidence library or control program.',
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
  TasksController_getTaskAttachmentDownloadUrl_v1: {
    summary: 'Get task attachment download URL',
    description:
      'Generate a signed download URL for an attachment on a compliance task so reviewers can access uploaded evidence.',
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
  ContextController_getAllContext_v1: {
    summary: 'List organization context',
    description:
      'List organization context entries used as approved source material for evidence, questionnaires, policies, and AI workflows.',
  },
  ContextController_getContextById_v1: {
    summary: 'Get organization context',
    description:
      'Retrieve one organization context entry with source details and approved content for compliance automation workflows.',
  },
  ContextController_updateContext_v1: {
    summary: 'Update organization context',
    description:
      'Update an organization context entry so approved business details stay current for evidence and questionnaire automation.',
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
  DevicesController_getAllDevices_v1: {
    summary: 'List managed devices',
    description:
      'List managed employee devices with endpoint compliance status, ownership, and security check results for workforce controls.',
  },
  SecurityPenetrationTestsController_create_v1: {
    summary: 'Create penetration test',
    description:
      'Create an AI-powered penetration test run for an approved target and track the resulting findings and report artifacts.',
  },
  PeopleController_updateMember_v1: {
    summary: 'Update workforce member',
    description:
      'Update a workforce member profile, role, department, or compliance metadata used for people-security controls.',
  },
  VendorsController_triggerAssessment_v1: {
    summary: 'Trigger vendor risk assessment',
    description:
      'Trigger a vendor risk assessment so Comp AI can update third-party risk evidence and vendor security review status.',
  },
  VendorsController_getVendorById_v1: {
    summary: 'Get vendor details',
    description:
      'Retrieve one vendor record with ownership, review status, risk context, and third-party compliance metadata.',
  },
  VendorsController_updateVendor_v1: {
    summary: 'Update vendor record',
    description:
      'Update vendor ownership, risk attributes, review metadata, and third-party compliance context for an organization.',
  },
  RisksController_getRiskById_v1: {
    summary: 'Get organization risk',
    description:
      'Retrieve one organization risk with owner, department, likelihood, impact, mitigation, and remediation context.',
  },
  RisksController_deleteRisk_v1: {
    summary: 'Delete organization risk',
    description:
      'Delete an organization risk that no longer needs active tracking in the risk register or compliance program.',
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
  ...TRUST_OPERATION_METADATA,
  ...QUESTIONNAIRE_OPERATION_METADATA,
};
