import type { PublicTagMetadata } from './types';

export const PUBLIC_TAG_METADATA: Record<string, PublicTagMetadata> = {
  'Assistant Chat': {
    description:
      'Internal AI assistant endpoints for product chat history and streamed completions.',
    visibility: 'excluded',
  },
  Attachments: {
    description:
      'Generate signed download links for files attached to compliance tasks, comments, evidence records, and workflow reviews.',
  },
  'Audit Logs': {
    description:
      'Retrieve audit trails for compliance activity, evidence changes, access decisions, and customer-facing security review workflows.',
  },
  'Background Check Billing': {
    description:
      'Manage Stripe setup and billing sessions for background check purchases inside the Comp AI app.',
    visibility: 'excluded',
  },
  'Background Checks': {
    description:
      'Request, review, and attach employee background checks used as people-security evidence for compliance programs.',
  },
  Billing: {
    description:
      'Manage organization billing status, preferences, checkout sessions, customer portal links, and Stripe webhook handling.',
    visibility: 'excluded',
  },
  Browserbase: {
    description:
      'Internal browser automation endpoints used to collect auditable evidence from web applications.',
    visibility: 'excluded',
  },
  CloudSecurity: {
    group: 'Cloud Security',
    description:
      'Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work.',
  },
  Comments: {
    description:
      'Create and manage collaboration comments on compliance entities such as tasks, policies, risks, vendors, and findings.',
  },
  Context: {
    description:
      'Manage organization context that helps Comp AI tailor policies, assessments, and compliance automation to the business.',
  },
  Controls: {
    description:
      'Manage controls, map them to policies, tasks, framework requirements, and evidence document types, and track implementation progress.',
  },
  'Device Agent': {
    description:
      'Register employee devices, submit device compliance check-ins, download agent builds, and manage endpoint security status.',
  },
  Devices: {
    description:
      'Read and manage employee device inventory and Fleet compliance data used for endpoint security controls.',
  },
  'Email - Unsubscribe': {
    description:
      'Handle one-click email unsubscribe requests for notification compliance.',
    visibility: 'excluded',
  },
  'Evidence Export': {
    description:
      'Export task evidence, automation evidence, and reviewer-ready evidence bundles as PDF or ZIP files.',
  },
  'Evidence Export (Auditor)': {
    description:
      'Export all organization evidence for an auditor review package.',
  },
  'Evidence Forms': {
    description:
      'Collect, review, upload, and export structured evidence submissions for compliance tasks and document requirements.',
  },
  'Finding Templates': {
    description:
      'Manage reusable finding templates used by platform administrators and audit workflows.',
    visibility: 'excluded',
  },
  Findings: {
    description:
      'Create, review, update, and track audit findings, remediation activity, and finding history for an organization.',
  },
  Frameworks: {
    description:
      'Manage SOC 2, ISO 27001, HIPAA, GDPR, FedRAMP, and custom framework instances, requirements, scores, and sync history.',
  },
  Health: {
    description: 'Check API service health for uptime monitoring.',
    visibility: 'excluded',
  },
  Integrations: {
    description:
      'Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence.',
  },
  'Knowledge Base': {
    description:
      'Upload source documents, process them for retrieval, and manage reusable manual answers that power questionnaires and AI policy workflows.',
  },
  'Org Chart': {
    description:
      'Manage organization chart metadata and evidence used for governance, accountability, and audit readiness.',
  },
  Organization: {
    description:
      'Manage organization profile data, API keys, logos, ownership, role notifications, and access approval settings.',
  },
  People: {
    description:
      'Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records.',
  },
  'Pentest Credits': {
    description:
      'Read penetration-test credit balances used by the Comp AI purchasing flow.',
    visibility: 'excluded',
  },
  Policies: {
    description:
      'Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows.',
  },
  Questionnaire: {
    description:
      'Parse security questionnaires, generate answers from approved evidence, save reviewer edits, stream progress, and export completed files.',
  },
  Remediation: {
    description:
      'Preview, execute, roll back, and track cloud security remediation actions for supported AWS, Azure, and GCP findings.',
  },
  Risks: {
    description:
      'Create, update, and report on organizational risks with ownership, departments, and compliance remediation status.',
  },
  Roles: {
    description:
      'Create custom roles and resolve permission sets for organization-level access control.',
  },
  SOA: {
    group: 'Statement of Applicability',
    description:
      'Create, auto-fill, review, approve, and export ISO 27001 Statement of Applicability documents.',
  },
  Secrets: {
    description:
      'Store and manage encrypted automation secrets used by evidence collection and integration workflows.',
    visibility: 'excluded',
  },
  'Security Penetration Tests': {
    description:
      'Create AI-powered penetration test runs, track progress, inspect findings and events, and download markdown or PDF reports.',
  },
  'Task Automations': {
    description:
      'Create, version, run, and inspect automated evidence collection workflows attached to compliance tasks.',
  },
  'Task Management': {
    description:
      'Manage task items and attachments linked to operational entities such as risks and vendors.',
  },
  Tasks: {
    description:
      'Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history.',
  },
  Timelines: {
    description:
      'Track audit and compliance readiness timelines, phases, and review milestones for an organization.',
  },
  Training: {
    description:
      'Record security awareness and HIPAA training completion status and generate completion certificates.',
  },
  'Trust Access': {
    description:
      'Manage external Trust Center access requests, NDA signing, grants, tokenized document downloads, public FAQs, and reviewer access.',
  },
  'Trust Portal': {
    description:
      'Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures.',
  },
  Vendors: {
    description:
      'Manage third-party vendors, global vendor search, risk assessment triggers, and Trust Center vendor visibility.',
  },
  Webhook: {
    description: 'Receive provider webhook events for integration workflows.',
    visibility: 'excluded',
  },
};
