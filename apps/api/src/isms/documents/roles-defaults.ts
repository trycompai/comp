import type { SeedRoleDefinition } from './types';

/**
 * The four seeded ISMS governance roles (clause 5.3) and their pre-filled
 * default text. Drafted from the reference document
 * ("05a - ISMS Roles, Responsibilities & Authorities") so a customer with no ISO
 * expertise gets a workable baseline; every field is editable in the app.
 *
 * Order is the render/seed order. `roleKey` is the idempotency key for seeding.
 */
export const SEED_ROLE_DEFINITIONS: SeedRoleDefinition[] = [
  {
    roleKey: 'top_management',
    name: 'Top Management',
    description:
      'The executive leadership accountable for the ISMS. Top management sets the direction of the information security programme and provides the mandate and resources for it to operate.',
    responsibilities:
      'Approve the ISMS scope, information security policy, and objectives; provide the resources the ISMS needs; direct and support the people contributing to the ISMS; promote continual improvement; and accept or escalate residual risk.',
    authorities:
      'Approve the ISMS and accept residual risk on behalf of the organisation.',
    authorityGrantedBy: 'The executive office and the Board of Directors',
    requiredCompetence:
      'Executive understanding of the organisation, its risk appetite, and its legal and regulatory obligations, sufficient to direct the ISMS and be accountable for it.',
  },
  {
    roleKey: 'spo',
    name: 'Security & Privacy Owner (SPO)',
    description:
      'The person who owns and operates the ISMS day to day and is the focal point for information security and privacy across the organisation.',
    responsibilities:
      'Operate the ISMS day to day — scope, Statement of Applicability, risk, vendor, policy, training, incident, and audit programmes; ensure the ISMS conforms to ISO/IEC 27001; report ISMS performance to top management; and assign control, risk, and policy owners.',
    authorities:
      'Direct the security and privacy programme; assign control, risk, and policy owners; and approve exceptions within the organisation’s risk appetite.',
    authorityGrantedBy: 'Top Management',
    requiredCompetence:
      'Working knowledge of ISO/IEC 27001 and the organisation’s control environment, with the experience to operate an ISMS and make risk-based decisions within the agreed risk appetite.',
  },
  {
    roleKey: 'deputy_spo',
    name: 'Deputy Security & Privacy Owner',
    description:
      'The documented backup for the Security & Privacy Owner, ensuring the ISMS remains covered during the SPO’s absence.',
    responsibilities:
      'Provide documented backup for the SPO; act with the SPO’s authority during the SPO’s absence; and participate in incident response and management reviews as required.',
    authorities: 'Act with the SPO’s authority during the SPO’s absence.',
    authorityGrantedBy: 'Top Management',
    requiredCompetence:
      'Sufficient familiarity with the ISMS and the organisation’s controls to stand in for the SPO and make interim risk-based decisions.',
  },
  {
    roleKey: 'internal_auditor',
    name: 'Internal Auditor',
    description:
      'The person or party responsible for independently auditing the ISMS to confirm it conforms to ISO/IEC 27001 and is effectively implemented and maintained.',
    responsibilities:
      'Plan and conduct internal audits of the ISMS at the intervals defined in the audit programme; report findings and nonconformities; and maintain independence and impartiality from the areas audited.',
    authorities:
      'Access the information, systems, and personnel needed to conduct the audit, and report findings directly to top management.',
    authorityGrantedBy: 'Top Management',
    requiredCompetence:
      'Knowledge of ISO/IEC 27001 auditing (e.g. ISO 19011 principles) and the independence to audit the ISMS objectively; where in-house audit competence is not held, it is engaged externally.',
  },
];

/** roleKey values of the seeded roles, for validation and lookups. */
export const SEED_ROLE_KEYS = SEED_ROLE_DEFINITIONS.map((role) => role.roleKey);

/**
 * The two governance rows that appear only in the generated document (never as
 * editable role cards): the per-artifact operational owners and the whole
 * workforce. Holders/text are fixed.
 */
export const AUTO_DOC_ROLE_ROWS = [
  {
    name: 'Control / asset / risk / policy owners',
    holders: 'Identified in the platform per policy, control, risk, task, and vendor.',
    responsibilities:
      'Implement, operate, and evidence the specific controls, policies, risks, and evidence tasks assigned to them. Operational ownership is assigned at the artifact level in Comp AI.',
    authority: 'Make operational decisions for their assigned item. Authority granted by the SPO.',
  },
  {
    name: 'All personnel and contractors',
    holders: 'All workforce members.',
    responsibilities:
      'Comply with the policy set; complete required training; protect company data on personal devices; and report incidents and near-misses.',
    authority: 'Use approved tools and identity flows. Granted on engagement.',
  },
] as const;

/**
 * Non-removable note reproduced verbatim in the generated document (§2). Clarifies
 * that Comp AI application-access levels are not ISMS governance roles.
 */
export const APPLICATION_ACCESS_NOTE =
  'Comp AI application-access levels (Owner / Admin / Auditor / Employee / Contractor) are not ISMS governance roles. The ISMS governance roles are defined below.';

/** The application-access levels and what they grant (generated document §2). */
export const APPLICATION_ACCESS_LEVELS: string[] = [
  'Owner — the account creator.',
  'Admin — administrative access to the GRC platform.',
  'Auditor — read access provided to external auditors.',
  'Employee — access to the employee portal.',
  'Contractor — limited access for engaged contractors.',
];
