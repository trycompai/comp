export const DEFAULT_OFFBOARDING_CHECKLIST_ITEMS = [
  {
    title: 'Revoke system access',
    description:
      "Disable or remove the employee's access to all company systems, applications, and cloud services.",
    evidenceRequired: true,
    sortOrder: 1,
  },
  {
    title: 'Remove from identity provider',
    description:
      'Remove the employee from your identity provider (e.g., Okta, Azure AD, Google Workspace).',
    evidenceRequired: true,
    sortOrder: 2,
  },
  {
    title: 'Retrieve company devices',
    description:
      'Collect all company-owned hardware including laptops, phones, access badges, and security keys.',
    evidenceRequired: true,
    sortOrder: 3,
  },
  {
    title: 'Deactivate email and accounts',
    description:
      "Deactivate or redirect the employee's email account and remove from shared mailboxes and distribution lists.",
    evidenceRequired: true,
    sortOrder: 4,
  },
  {
    title: 'Revoke privileged access',
    description:
      'Remove any elevated permissions, admin rights, SSH keys, API tokens, or shared credentials the employee had access to.',
    evidenceRequired: true,
    sortOrder: 5,
  },
  {
    title: 'Notify relevant teams',
    description:
      "Inform the employee's team, IT, HR, and any relevant stakeholders of the departure.",
    evidenceRequired: false,
    sortOrder: 6,
  },
  {
    title: 'Exit interview completed',
    description:
      'Conduct an exit interview covering security reminders and NDA obligations.',
    evidenceRequired: false,
    sortOrder: 7,
  },
  {
    title: 'Update org chart and documentation',
    description:
      'Remove the employee from the org chart, on-call rotations, and internal documentation.',
    evidenceRequired: false,
    sortOrder: 8,
  },
] as const;
