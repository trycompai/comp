import { meetingFields } from './field-builders';
import type { EvidenceFormType } from './form-types';
import {
  boardMeetingMinutesPlaceholder,
  itLeadershipMinutesPlaceholder,
  riskCommitteeMinutesPlaceholder,
} from './minutes-placeholders';
import type { EvidenceFormDefinition } from './types';

export const meetingMinutesPlaceholders: Record<string, string> = {
  'board-meeting': boardMeetingMinutesPlaceholder,
  'it-leadership-meeting': itLeadershipMinutesPlaceholder,
  'risk-committee-meeting': riskCommitteeMinutesPlaceholder,
};

export const evidenceFormDefinitions: Record<EvidenceFormType, EvidenceFormDefinition> = {
  meeting: {
    type: 'meeting',
    title: 'Meeting Minutes',
    description: 'Record meeting minutes for board, IT leadership, or risk committee meetings.',
    category: 'Governance',
    submissionDateMode: 'custom',
    portalAccessible: false,
    fields: meetingFields(boardMeetingMinutesPlaceholder),
  },
  'board-meeting': {
    type: 'board-meeting',
    title: 'Board Meeting',
    description:
      "Create a company board that meets twice a year to discuss the company's direction. Conduct at least 1 meeting.",
    category: 'Governance',
    submissionDateMode: 'custom',
    portalAccessible: false,
    hidden: true,
    fields: meetingFields(boardMeetingMinutesPlaceholder),
  },
  'it-leadership-meeting': {
    type: 'it-leadership-meeting',
    title: 'IT Leadership Meeting',
    description:
      'Create an IT leadership committee that meets monthly to discuss tech development. Conduct at least 1 meeting.',
    category: 'Governance',
    submissionDateMode: 'custom',
    portalAccessible: false,
    hidden: true,
    fields: meetingFields(itLeadershipMinutesPlaceholder),
  },
  'risk-committee-meeting': {
    type: 'risk-committee-meeting',
    title: 'Risk Committee Meeting',
    description:
      'Create a risk committee that meets twice a year to discuss risks to your company. Conduct at least 1 meeting.',
    category: 'Governance',
    submissionDateMode: 'custom',
    portalAccessible: false,
    hidden: true,
    fields: meetingFields(riskCommitteeMinutesPlaceholder),
  },
  'access-request': {
    type: 'access-request',
    title: 'Access Request',
    description: 'Track and retain user access requests with justification.',
    category: 'Security',
    submissionDateMode: 'custom',
    portalAccessible: true,
    fields: [
      {
        key: 'userName',
        label: 'User Name',
        type: 'text',
        required: true,
        description: 'Full name of the person requesting access',
      },
      {
        key: 'accountsNeeded',
        label: 'Accounts Needed',
        type: 'textarea',
        required: true,
        description: 'Systems or platforms access is needed for',
        placeholder: `e.g. AWS Console (read-only), Salesforce (Sales role), GitHub (org: engineering)`,
      },
      {
        key: 'permissionsNeeded',
        label: 'Permissions Needed',
        type: 'select',
        required: true,
        description: 'Level of access required',
        options: [
          { label: 'Read', value: 'read' },
          { label: 'Write', value: 'write' },
          { label: 'Admin', value: 'admin' },
        ],
      },
      {
        key: 'reasonForRequest',
        label: 'Reason For Request',
        type: 'textarea',
        required: true,
        description: 'Business justification for access request',
        placeholder: `e.g. New hire joining the Sales team; needs access to CRM and email to perform account management duties. Access requested by hiring manager.`,
      },
      {
        key: 'accessGrantedBy',
        label: 'Access Granted By',
        type: 'text',
        required: true,
        description: 'Name of person who approved and granted access',
      },
      {
        key: 'dateAccessGranted',
        label: 'Date Access Granted',
        type: 'date',
        required: true,
        description: 'Date when access was provided',
      },
    ],
  },
  'whistleblower-report': {
    type: 'whistleblower-report',
    title: 'Whistleblower Report',
    description: 'Submit an anonymous whistleblower report. Submissions are confidential.',
    category: 'Security',
    submissionDateMode: 'auto',
    portalAccessible: true,
    optional: true,
    fields: [
      {
        key: 'incidentDate',
        label: 'Incident date',
        type: 'date',
        required: true,
        description: 'Date the incident occurred',
      },
      {
        key: 'complaintDetails',
        label: 'Complaint Details',
        type: 'textarea',
        required: true,
        description: 'Detailed description of the complaint or concern',
        placeholder: `Describe what happened, when and where it occurred, and the nature of the concern. Include any relevant facts or circumstances.`,
      },
      {
        key: 'individualsInvolved',
        label: 'Individuals Involved',
        type: 'textarea',
        required: true,
        description: 'Names or roles of people involved in the incident',
        placeholder: `e.g. John Smith (Manager, Sales), Jane Doe (HR), or describe by role if names are unknown`,
      },
      {
        key: 'evidence',
        label: 'Evidence',
        type: 'textarea',
        required: true,
        description: 'Any supporting evidence or documentation',
        placeholder: `Describe any documents, emails, messages, or other materials that support this report. You may also attach files below.`,
      },
      {
        key: 'evidenceFile',
        label: 'Supporting file',
        type: 'file',
        required: false,
        accept: '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg',
        description: 'Optional file attachment to support your report',
      },
    ],
  },
  'penetration-test': {
    type: 'penetration-test',
    title: 'Penetration Test',
    description:
      'Upload a third-party penetration test report to satisfy security testing evidence requirements.',
    category: 'Security',
    submissionDateMode: 'custom',
    portalAccessible: false,
    fields: [
      {
        key: 'testDate',
        label: 'Test date',
        type: 'date',
        required: true,
        description: 'Date the penetration test was conducted',
      },
      {
        key: 'vendorName',
        label: 'Vendor / testing firm',
        type: 'text',
        required: true,
        description: 'Name of the third-party firm that performed the test',
      },
      {
        key: 'summary',
        label: 'Summary of findings',
        type: 'textarea',
        required: true,
        description: 'High-level summary of test scope, findings, and remediation status',
        placeholder: `Scope: e.g. External perimeter, web application, API endpoints.
Findings: Summarize critical/high findings and how they were identified.
Remediation: Status of fixes (e.g. 3 of 5 critical findings remediated; 2 in progress with target dates).`,
      },
      {
        key: 'pentestReport',
        label: 'Pentest report (PDF)',
        type: 'file',
        required: true,
        accept: '.pdf',
        description: 'Upload the full third-party penetration test report',
      },
    ],
  },
  'rbac-matrix': {
    type: 'rbac-matrix',
    title: 'RBAC Matrix',
    description:
      'Track role-based access control by documenting systems, roles, permissions scope, assignees, and approval records.',
    category: 'Security',
    submissionDateMode: 'custom',
    portalAccessible: false,
    fields: [
      {
        key: 'matrixRows',
        label: 'RBAC entries',
        type: 'matrix',
        required: true,
        description: 'Audit-minimum role access evidence.',
        addRowLabel: 'Add RBAC row',
        columns: [
          {
            key: 'system',
            label: 'System',
            required: true,
            placeholder: 'e.g. AWS',
          },
          {
            key: 'roleName',
            label: 'Role Name',
            required: true,
            placeholder: 'e.g. prod:operator',
          },
          {
            key: 'permissionsScope',
            label: 'Permissions / Scope',
            required: true,
            placeholder: 'Assume role; read logs/metrics; no IAM:admin',
          },
          {
            key: 'approvedBy',
            label: 'Approved By',
            required: true,
            placeholder: 'name, role',
          },
          {
            key: 'lastReviewed',
            label: 'Last Reviewed',
            required: true,
            placeholder: 'YYYY-MM-DD',
          },
        ],
      },
    ],
  },
  'infrastructure-inventory': {
    type: 'infrastructure-inventory',
    title: 'Infrastructure Inventory',
    description:
      'Maintain an infrastructure inventory across cloud and on-prem assets with ownership, platform details, and review cadence.',
    category: 'Security',
    submissionDateMode: 'custom',
    portalAccessible: false,
    fields: [
      {
        key: 'inventoryRows',
        label: 'Infrastructure assets',
        type: 'matrix',
        required: true,
        description: 'Audit-minimum infrastructure evidence.',
        addRowLabel: 'Add asset row',
        columns: [
          {
            key: 'assetId',
            label: 'Asset ID',
            required: true,
            placeholder: 'e.g. 001',
          },
          {
            key: 'systemType',
            label: 'System Type',
            required: true,
            placeholder: 'e.g. EC2 Instance',
          },
          {
            key: 'environment',
            label: 'Environment',
            required: true,
            placeholder: 'e.g. Production',
          },
          {
            key: 'location',
            label: 'Location',
            placeholder: 'e.g. AWS ap-south-1 / on-prem',
          },
          {
            key: 'assignedOwner',
            label: 'Assigned Owner',
            required: true,
            placeholder: 'e.g. DevOps Team',
          },
          {
            key: 'lastReviewed',
            label: 'Last Reviewed',
            required: true,
            placeholder: 'YYYY-MM-DD',
          },
        ],
      },
    ],
  },
  'employee-performance-evaluation': {
    type: 'employee-performance-evaluation',
    title: 'Employee Performance Evaluation',
    description: 'Capture a lightweight performance review record for audit evidence.',
    category: 'People',
    submissionDateMode: 'custom',
    portalAccessible: false,
    fields: [
      {
        key: 'employeeName',
        label: 'Employee name',
        type: 'text',
        required: true,
        description: 'Full name of the employee being reviewed',
      },
      {
        key: 'manager',
        label: 'Manager',
        type: 'text',
        required: true,
        description: 'Name of the reviewing manager',
      },
      {
        key: 'reviewPeriodTo',
        label: 'Review period end date',
        type: 'date',
        required: true,
        description: 'End date of the review period',
      },
      {
        key: 'overallRating',
        label: 'Overall Rating',
        type: 'select',
        required: true,
        description: "Manager's overall performance rating",
        options: [
          { label: 'Needs Improvement', value: 'needs-improvement' },
          { label: 'Meets Expectations', value: 'meets-expectations' },
          { label: 'Exceeds Expectations', value: 'exceeds-expectations' },
        ],
      },
      {
        key: 'managerSignature',
        label: 'Manager signature (name)',
        type: 'text',
        required: true,
        description: 'Typed name of the manager as signature',
      },
      {
        key: 'managerSignatureDate',
        label: 'Manager signature date',
        type: 'date',
        required: true,
        description: 'Date the manager signed the review',
      },
      {
        key: 'managerComments',
        label: 'Manager Comments',
        type: 'textarea',
        required: true,
        description: "Manager's written performance feedback and observations",
        placeholder: `Summarize strengths, areas for improvement, and key accomplishments during the review period. Include specific examples where helpful.`,
      },
    ],
  },
  'network-diagram': {
    type: 'network-diagram',
    title: 'Network Diagram',
    description:
      'Provide either a link to your network diagram or upload a file (at least one required). Optional—include if you have a current diagram of your infrastructure.',
    category: 'Security',
    submissionDateMode: 'custom',
    portalAccessible: false,
    fields: [
      {
        key: 'diagramUrl',
        label: 'Link to diagram (optional if you upload a file)',
        type: 'text',
        required: false,
        description: 'URL to a hosted diagram (e.g. Lucidchart, draw.io, Confluence)',
        placeholder: 'https://...',
      },
      {
        key: 'diagramFile',
        label: 'Or upload file (optional if you add a link above)',
        type: 'file',
        required: false,
        accept: '.pdf,.png,.jpg,.jpeg,.svg,.vsdx',
        description: 'PDF, image, or Visio file',
      },
    ],
  },
  'tabletop-exercise': {
    type: 'tabletop-exercise',
    title: 'Incident Response Tabletop Exercise',
    description:
      'Conduct a periodic tabletop exercise to test the effectiveness of your incident response plan. Simulate a security incident to ensure all team members understand their roles, communication channels, and procedures during a real event.',
    category: 'Security',
    submissionDateMode: 'custom',
    portalAccessible: false,
    fields: [
      {
        key: 'exerciseDate',
        label: 'Exercise date',
        type: 'date',
        required: true,
        description: 'Date the tabletop exercise was conducted',
      },
      {
        key: 'facilitator',
        label: 'Facilitator',
        type: 'text',
        required: true,
        description: 'Name and title of the person who facilitated the exercise',
        placeholder: 'e.g. Jane Doe, CISO',
      },
      {
        key: 'scenarioType',
        label: 'Scenario type',
        type: 'select',
        required: true,
        description: 'Category of the simulated incident',
        options: [
          { label: 'Data Breach', value: 'data-breach' },
          { label: 'Ransomware', value: 'ransomware' },
          { label: 'Insider Threat', value: 'insider-threat' },
          { label: 'Phishing Attack', value: 'phishing' },
          { label: 'DDoS Attack', value: 'ddos' },
          { label: 'Third-Party / Supply Chain Breach', value: 'third-party-breach' },
          { label: 'Natural Disaster / BCP', value: 'natural-disaster' },
          { label: 'Custom', value: 'custom' },
        ],
      },
      {
        key: 'scenarioDescription',
        label: 'Scenario description',
        type: 'textarea',
        required: true,
        description:
          'Describe the simulated incident scenario in detail. Include the threat vector, affected systems, timeline of events, and any injects (new information introduced during the exercise).',
        placeholder: `Scenario: Ransomware attack via phishing email

Timeline:
- 09:00 — An employee in the finance department clicks a link in a phishing email and unknowingly downloads malware.
- 09:15 — The malware begins encrypting files on the employee's workstation and mapped network drives.
- 09:30 — IT helpdesk receives reports of inaccessible files from multiple users.
- 09:45 — Security team identifies ransomware indicators and initiates incident response.
- 10:00 — A ransom note is discovered demanding payment in cryptocurrency.

Affected systems: Finance file server, shared network drives, employee workstations
Threat vector: Phishing email with malicious attachment
Injects: At 10:30, media contacts the company about the incident.`,
      },
      {
        key: 'attendees',
        label: 'Attendees',
        type: 'matrix',
        required: true,
        description:
          'List all participants with their name, role or title, and department. Include anyone who would be involved in a real incident response.',
        addRowLabel: 'Add attendee',
        columns: [
          {
            key: 'name',
            label: 'Name',
            required: true,
            placeholder: 'e.g. Jane Doe',
          },
          {
            key: 'roleTitle',
            label: 'Role / Title',
            required: true,
            placeholder: 'e.g. Incident Commander',
          },
          {
            key: 'department',
            label: 'Department',
            required: true,
            placeholder: 'e.g. Information Security',
          },
        ],
      },
      {
        key: 'sessionNotes',
        label: 'Session notes',
        type: 'textarea',
        required: true,
        description:
          'Document the key discussion points, decisions made, communication steps taken, and observations during the exercise. Note how each team member responded to the scenario.',
        placeholder: `1. Initial Detection and Triage
- IT helpdesk escalated to security team within 15 minutes of first report.
- Security analyst confirmed ransomware indicators using EDR tooling.
- Incident Commander was notified and activated the IR plan.

2. Containment
- Decision made to isolate affected network segment immediately.
- Discussed whether to shut down the finance file server vs. disconnect from network.
- Team agreed on network isolation to preserve forensic evidence.

3. Communication
- Internal: Slack channel created for incident coordination; VP of Engineering notified.
- External: Legal counsel advised on breach notification requirements.
- Media: Communications team prepared a holding statement.

4. Recovery
- Backup restoration timeline estimated at 4-6 hours.
- Team identified that backup verification had not been tested in 3 months.

5. Observations
- Gap identified: No documented procedure for media inquiries during an incident.
- Positive: Team demonstrated clear understanding of escalation paths.`,
      },
      {
        key: 'actionItems',
        label: 'After-action report',
        type: 'matrix',
        required: true,
        description:
          'List findings from the exercise with improvement actions, assigned owners, and target due dates.',
        addRowLabel: 'Add finding',
        columns: [
          {
            key: 'finding',
            label: 'Finding',
            required: true,
            placeholder: 'e.g. No documented media response procedure',
          },
          {
            key: 'improvementAction',
            label: 'Improvement Action',
            required: true,
            placeholder: 'e.g. Create media response playbook',
          },
          {
            key: 'assignedOwner',
            label: 'Assigned Owner',
            required: true,
            placeholder: 'e.g. Jane Doe, Comms Lead',
          },
          {
            key: 'dueDate',
            label: 'Due Date',
            required: true,
            placeholder: 'YYYY-MM-DD',
          },
        ],
      },
      {
        key: 'evidenceFile',
        label: 'Supporting evidence',
        type: 'file',
        required: false,
        accept: '.pdf,.doc,.docx,.png,.jpg,.jpeg',
        description:
          'Optionally upload additional evidence such as slides, agendas, or sign-in sheets',
      },
    ],
  },
};

export const evidenceFormDefinitionList = Object.values(evidenceFormDefinitions);
