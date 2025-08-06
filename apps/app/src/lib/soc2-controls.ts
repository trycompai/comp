export const getSoc2Framework = (t: (content: string) => string) => ({
  name: t('SOC 2'),
  description: t('SOC 2 Framework'),
  version: '2022',
});

export const getSoc2Categories = (t: (content: string) => string) => [
  {
    name: t('CC1: Control Environment'),
    code: 'CC1',
    description: t(
      "This criterion assesses the organization's commitment to ethical values, governance, and integrity."
    ),
  },
  {
    name: t('CC2: Communications and Information'),
    code: 'CC2',
    description: t(
      'This criterion ensures that the organization has an unimpeded flow of information to support its security efforts.'
    ),
  },
  {
    name: t('CC3: Risk Assessment'),
    code: 'CC3',
    description: t(
      'This criterion ensures that the organization has a process for identifying, assessing, and managing risks to its security posture.'
    ),
  },
  {
    name: t('CC4: Monitoring Controls'),
    code: 'CC4',
    description: t(
      'This criterion ensures that the organization has a process for monitoring and testing its security posture.'
    ),
  },
  {
    name: t('CC5: Control Activities'),
    code: 'CC5',
    description: t(
      'This criterion ensures that the organization has a process for controlling its security posture.'
    ),
  },
  {
    name: t('CC6: Logical and Physical Access Controls'),
    code: 'CC6',
    description: t(
      'This criterion ensures that the organization has a process for controlling access to its security posture.'
    ),
  },
  {
    name: t('CC7: System Operations'),
    code: 'CC7',
    description: t(
      'This criterion ensures that the organization has a process for operating its systems and information.'
    ),
  },
  {
    name: t('CC8: Change Management'),
    code: 'CC8',
    description: t(
      'This criterion ensures that the organization has a process for managing changes to its security posture.'
    ),
  },
  {
    name: t('CC9: Risk Mitigation'),
    code: 'CC9',
    description: t(
      'This criterion ensures that the organization has a process for mitigating risks to its security posture.'
    ),
  },
];

export const getSoc2Controls = (t: (content: string) => string) => [
  {
    code: 'CC1.1',
    name: t('Board Oversight'),
    description: t(
      'The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal control.'
    ),
    categoryId: 'CC1',
    requiredArtifactTypes: ['policy', 'procedure'],
  },
  {
    code: 'CC1.2',
    name: t('Management Philosophy'),
    description: t(
      'Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of objectives.'
    ),
    categoryId: 'CC1',
    requiredArtifactTypes: ['policy', 'procedure'],
  },
  {
    code: 'CC1.3',
    name: t('Organizational Structure'),
    description: t(
      'The organization demonstrates a commitment to attract, develop, and retain competent individuals in alignment with objectives.'
    ),
    categoryId: 'CC1',
    requiredArtifactTypes: ['policy', 'procedure'],
  },
  {
    code: 'CC1.4',
    name: t('Personnel Policies'),
    description: t(
      'The organization holds individuals accountable for their internal control responsibilities in the pursuit of objectives.'
    ),
    categoryId: 'CC1',
    requiredArtifactTypes: ['policy', 'procedure', 'training'],
  },
  {
    code: 'CC1.5',
    name: t('Code of Conduct'),
    description: t('The organization demonstrates a commitment to integrity and ethical values.'),
    categoryId: 'CC1',
    requiredArtifactTypes: ['policy', 'training'],
  },

  // CC2: Communication and Information
  {
    code: 'CC2.1',
    name: t('Information Quality'),
    description: t(
      'The organization obtains or generates and uses relevant, quality information to support the functioning of internal control.'
    ),
    categoryId: 'CC2',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC2.2',
    name: t('Internal Communication'),
    description: t(
      'The organization internally communicates information, including objectives and responsibilities for internal control.'
    ),
    categoryId: 'CC2',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC2.3',
    name: t('External Communication'),
    description: t(
      'The organization communicates with external parties regarding matters affecting the functioning of internal control.'
    ),
    categoryId: 'CC2',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC3: Risk Assessment
  {
    code: 'CC3.1',
    name: t('Risk Assessment Process'),
    description: t(
      'The organization specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives.'
    ),
    categoryId: 'CC3',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC3.2',
    name: t('Risk Identification'),
    description: t(
      'The organization identifies risks to the achievement of its objectives across the entity and analyzes risks as a basis for determining how the risks should be managed.'
    ),
    categoryId: 'CC3',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC3.3',
    name: t('Fraud Risk Assessment'),
    description: t(
      'The organization considers the potential for fraud in assessing risks to the achievement of objectives.'
    ),
    categoryId: 'CC3',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC3.4',
    name: t('Change Management Risk'),
    description: t(
      'The organization identifies and assesses changes that could significantly impact the system of internal control.'
    ),
    categoryId: 'CC3',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC4: Monitoring Activities
  {
    code: 'CC4.1',
    name: t('Control Monitoring'),
    description: t(
      'The organization selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning.'
    ),
    categoryId: 'CC4',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC4.2',
    name: t('Deficiency Management'),
    description: t(
      'The organization evaluates and communicates internal control deficiencies in a timely manner to those parties responsible for taking corrective action.'
    ),
    categoryId: 'CC4',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC5: Control Activities
  {
    code: 'CC5.1',
    name: t('Control Selection'),
    description: t(
      'The organization selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.'
    ),
    categoryId: 'CC5',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC5.2',
    name: t('Technology Controls'),
    description: t(
      'The organization selects and develops general control activities over technology to support the achievement of objectives.'
    ),
    categoryId: 'CC5',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC5.3',
    name: t('Policy Implementation'),
    description: t(
      'The organization deploys control activities through policies that establish what is expected and procedures that put policies into action.'
    ),
    categoryId: 'CC5',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC6: Logical and Physical Access Controls
  {
    code: 'CC6.1',
    name: t('Access Security'),
    description: t(
      'The organization implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events.'
    ),
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.2',
    name: t('Access Authentication'),
    description: t(
      'Prior to issuing system credentials and granting system access, the organization registers and authorizes new internal and external users.'
    ),
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.3',
    name: t('Access Removal'),
    description: t(
      'The organization removes access to protected information assets when appropriate.'
    ),
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.4',
    name: t('Access Review'),
    description: t(
      'The organization evaluates and manages access to protected information assets on a periodic basis.'
    ),
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.5',
    name: t('System Account Management'),
    description: t(
      'The organization identifies and authenticates system users, devices, and other systems before allowing access.'
    ),
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.6',
    name: t('Access Restrictions'),
    description: t(
      'The organization restricts physical access to facilities and protected information assets.'
    ),
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.7',
    name: t('Information Asset Changes'),
    description: t(
      'The organization manages changes to system components to minimize the risk of unauthorized changes.'
    ),
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.8',
    name: t('Malicious Software Prevention'),
    description: t(
      'The organization implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software.'
    ),
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC7: System Operations
  {
    code: 'CC7.1',
    name: t('Infrastructure Monitoring'),
    description: t(
      'To detect and act upon security events in a timely manner, the organization monitors system capacity, security threats, changing regulatory requirements, and other system vulnerabilities.'
    ),
    categoryId: 'CC7',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC7.2',
    name: t('Security Event Response'),
    description: t(
      'The organization designs, develops, and implements policies and procedures to respond to security incidents and breaches.'
    ),
    categoryId: 'CC7',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC7.3',
    name: t('Security Event Recovery'),
    description: t(
      'The organization implements recovery procedures to ensure timely restoration of systems or assets affected by security incidents.'
    ),
    categoryId: 'CC7',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC7.4',
    name: t('Security Event Analysis'),
    description: t(
      'The organization implements incident response activities to identify root causes of security incidents and develop remediation plans.'
    ),
    categoryId: 'CC7',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC8: Change Management
  {
    code: 'CC8.1',
    name: t('Change Authorization'),
    description: t(
      'The organization authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures.'
    ),
    categoryId: 'CC8',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC9: Risk Mitigation
  {
    code: 'CC9.1',
    name: t('Business Continuity Planning'),
    description: t(
      'The organization identifies, develops, and implements activities to recover critical information technology resources.'
    ),
    categoryId: 'CC9',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC9.2',
    name: t('Vendor Risk Management'),
    description: t(
      'The organization assesses and manages risks associated with vendors and business partners.'
    ),
    categoryId: 'CC9',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC9.9',
    name: t('Business Continuity and Disaster Recovery Testing'),
    description: t(
      'The organization tests business continuity and disaster recovery plans, evaluates the test results, and updates the plans accordingly.'
    ),
    categoryId: 'CC9',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
];

export const soc2RequiredArtifacts = [];
