import type { PublicOperationMetadata } from './types';

export const WORKFLOW_OPERATION_METADATA: Record<
  string,
  PublicOperationMetadata
> = {
  FrameworksController_findAll_v1: {
    summary: 'List compliance frameworks',
    description:
      'List active SOC 2, ISO 27001, HIPAA, GDPR, FedRAMP, and custom compliance frameworks with implementation status and progress data.',
  },
  FrameworksController_addFrameworks_v1: {
    summary: 'Add compliance frameworks',
    description:
      'Add one or more compliance frameworks to an organization so tasks, controls, evidence, and readiness tracking can be generated.',
  },
  FrameworksController_findAvailable_v1: {
    summary: 'List available frameworks',
    description:
      'List frameworks available for activation before starting a new compliance program or expanding into another standard.',
  },
  FrameworksController_getScores_v1: {
    summary: 'Get framework readiness scores',
    description:
      'Retrieve framework readiness scores so teams can report progress toward audit readiness across active compliance standards.',
  },
  FrameworksController_syncFramework_v1: {
    summary: 'Sync framework requirements',
    description:
      'Sync framework requirements, controls, and tasks after framework content changes so compliance tracking remains current.',
  },
  ControlsController_findAll_v1: {
    summary: 'List compliance controls',
    description:
      'List controls with linked policies, tasks, requirements, and document types for SOC 2, ISO 27001, HIPAA, and GDPR programs.',
  },
  ControlsController_create_v1: {
    summary: 'Create compliance control',
    description:
      'Create a custom compliance control and connect it to framework requirements, policies, tasks, and evidence expectations.',
  },
  ControlsController_linkPolicies_v1: {
    summary: 'Link policies to control',
    description:
      'Link policies to a control so auditors and reviewers can trace control implementation back to approved policy evidence.',
  },
  ControlsController_linkTasks_v1: {
    summary: 'Link tasks to control',
    description:
      'Link compliance tasks to a control so implementation work, evidence collection, and review status stay connected.',
  },
  EvidenceFormsController_listForms_v1: {
    summary: 'List evidence forms',
    description:
      'List structured evidence forms that collect recurring submissions for security, HR, IT, finance, and compliance workflows.',
  },
  EvidenceFormsController_submitForm_v1: {
    summary: 'Submit evidence form',
    description:
      'Submit structured evidence responses and attachments for review against a compliance task or document requirement.',
  },
  EvidenceFormsController_reviewSubmission_v1: {
    summary: 'Review evidence submission',
    description:
      'Approve or reject a submitted evidence form so task status and audit readiness reflect the latest review decision.',
  },
  EvidenceFormsController_exportCsv_v1: {
    summary: 'Export evidence submissions',
    description:
      'Export evidence form submissions as CSV for auditor requests, offline review, or internal compliance reporting.',
  },
  PeopleController_getAllPeople_v1: {
    summary: 'List workforce members',
    description:
      'List employees and contractors with onboarding, training, device, and compliance status used for people-security controls.',
  },
  PeopleController_inviteMembers_v1: {
    summary: 'Invite workforce members',
    description:
      'Invite employees or contractors to complete portal tasks, training, device setup, and compliance evidence requirements.',
  },
  PeopleController_getFleetCompliance_v1: {
    summary: 'Get fleet compliance',
    description:
      'Retrieve Fleet device compliance status so endpoint security findings can support people-security controls and audit evidence.',
  },
  TrainingController_getCompletions_v1: {
    summary: 'List training completions',
    description:
      'List security awareness and HIPAA training completion records for workforce compliance tracking and audit evidence.',
  },
  TrainingController_generateCertificate_v1: {
    summary: 'Generate training certificate',
    description:
      'Generate a training completion certificate that can be shared with auditors or attached as workforce security evidence.',
  },
  VendorsController_getAllVendors_v1: {
    summary: 'List vendors',
    description:
      'List third-party vendors with risk level, owner, assessment status, and Trust Center visibility for vendor risk management.',
  },
  VendorsController_createVendor_v1: {
    summary: 'Create vendor',
    description:
      'Create a vendor record so teams can track third-party risk, assessment evidence, owner, category, and compliance status.',
  },
  VendorsController_searchGlobalVendors_v1: {
    summary: 'Search global vendors',
    description:
      'Search global vendor records to prefill vendor profiles and speed up third-party risk assessment workflows.',
  },
  RisksController_getAllRisks_v1: {
    summary: 'List organization risks',
    description:
      'List organization risks with owners, departments, severity, mitigation status, and evidence for risk management reporting.',
  },
  RisksController_updateRisk_v1: {
    summary: 'Update organization risk',
    description:
      'Update a risk record as mitigation work progresses so compliance reports reflect the current risk posture.',
  },
  FindingsController_listFindings_v1: {
    summary: 'List audit findings',
    description:
      'List audit findings with status, severity, owner, history, and remediation context for compliance review workflows.',
  },
  FindingsController_createFinding_v1: {
    summary: 'Create audit finding',
    description:
      'Create an audit finding so teams can track issue ownership, remediation activity, severity, and supporting evidence.',
  },
  AuditLogController_getAuditLogs_v1: {
    summary: 'List audit logs',
    description:
      'List organization audit logs for compliance activity, access changes, evidence updates, and customer-facing review events.',
  },
  SOAController_autoFill_v1: {
    summary: 'Auto-fill ISO 27001 SOA',
    description:
      'Auto-fill a Statement of Applicability draft using organization context and framework mappings for ISO 27001 review.',
  },
  SOAController_exportDocument_v1: {
    summary: 'Export ISO 27001 SOA',
    description:
      'Export the approved Statement of Applicability document for ISO 27001 auditors, customer reviews, and internal records.',
  },
};
