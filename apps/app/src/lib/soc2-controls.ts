export const soc2Framework = {
  name: 'SOC 2',
  description: 'SOC 2 Framework',
  version: '2022',
};

export const soc2Categories = [
  {
    name: 'CC1: Control Environment',
    code: 'CC1',
    description:
      "This criterion assesses the organization's commitment to ethical values, governance, and integrity.",
  },
  {
    name: 'CC2: Communications and Information',
    code: 'CC2',
    description:
      'This criterion ensures that the organization has an unimpeded flow of information to support its security efforts.',
  },
  {
    name: 'CC3: Risk Assessment',
    code: 'CC3',
    description:
      'This criterion ensures that the organization has a process for identifying, assessing, and managing risks to its security posture.',
  },
  {
    name: 'CC4: Monitoring Controls',
    code: 'CC4',
    description:
      'This criterion ensures that the organization has a process for monitoring and testing its security posture.',
  },
  {
    name: 'CC5: Control Activities',
    code: 'CC5',
    description:
      'This criterion ensures that the organization has a process for controlling its security posture.',
  },
  {
    name: 'CC6: Logical and Physical Access Controls',
    code: 'CC6',
    description:
      'This criterion ensures that the organization has a process for controlling access to its security posture.',
  },
  {
    name: 'CC7: System Operations',
    code: 'CC7',
    description:
      'This criterion ensures that the organization has a process for operating its systems and information.',
  },
  {
    name: 'CC8: Change Management',
    code: 'CC8',
    description:
      'This criterion ensures that the organization has a process for managing changes to its security posture.',
  },
  {
    name: 'CC9: Risk Mitigation',
    code: 'CC9',
    description:
      'This criterion ensures that the organization has a process for mitigating risks to its security posture.',
  },
];

export const soc2Controls = [
  {
    code: 'CC1.1',
    name: 'Board Oversight',
    description:
      'The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal control.',
    categoryId: 'CC1',
    requiredArtifactTypes: ['policy', 'procedure'],
  },
  {
    code: 'CC1.2',
    name: 'Management Philosophy',
    description:
      'Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of objectives.',
    categoryId: 'CC1',
    requiredArtifactTypes: ['policy', 'procedure'],
  },
  {
    code: 'CC1.3',
    name: 'Organizational Structure',
    description:
      'The organization demonstrates a commitment to attract, develop, and retain competent individuals in alignment with objectives.',
    categoryId: 'CC1',
    requiredArtifactTypes: ['policy', 'procedure'],
  },
  {
    code: 'CC1.4',
    name: 'Personnel Policies',
    description:
      'The organization holds individuals accountable for their internal control responsibilities in the pursuit of objectives.',
    categoryId: 'CC1',
    requiredArtifactTypes: ['policy', 'procedure', 'training'],
  },
  {
    code: 'CC1.5',
    name: 'Code of Conduct',
    description: 'The organization demonstrates a commitment to integrity and ethical values.',
    categoryId: 'CC1',
    requiredArtifactTypes: ['policy', 'training'],
  },

  // CC2: Communication and Information
  {
    code: 'CC2.1',
    name: 'Information Quality',
    description:
      'The organization obtains or generates and uses relevant, quality information to support the functioning of internal control.',
    categoryId: 'CC2',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC2.2',
    name: 'Internal Communication',
    description:
      'The organization internally communicates information, including objectives and responsibilities for internal control.',
    categoryId: 'CC2',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC2.3',
    name: 'External Communication',
    description:
      'The organization communicates with external parties regarding matters affecting the functioning of internal control.',
    categoryId: 'CC2',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC3: Risk Assessment
  {
    code: 'CC3.1',
    name: 'Risk Assessment Process',
    description:
      'The organization specifies objectives with sufficient clarity to enable the identification and assessment of risks relating to objectives.',
    categoryId: 'CC3',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC3.2',
    name: 'Risk Identification',
    description:
      'The organization identifies risks to the achievement of its objectives across the entity and analyzes risks as a basis for determining how the risks should be managed.',
    categoryId: 'CC3',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC3.3',
    name: 'Fraud Risk Assessment',
    description:
      'The organization considers the potential for fraud in assessing risks to the achievement of objectives.',
    categoryId: 'CC3',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC3.4',
    name: 'Change Management Risk',
    description:
      'The organization identifies and assesses changes that could significantly impact the system of internal control.',
    categoryId: 'CC3',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC4: Monitoring Activities
  {
    code: 'CC4.1',
    name: 'Control Monitoring',
    description:
      'The organization selects, develops, and performs ongoing and/or separate evaluations to ascertain whether the components of internal control are present and functioning.',
    categoryId: 'CC4',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC4.2',
    name: 'Deficiency Management',
    description:
      'The organization evaluates and communicates internal control deficiencies in a timely manner to those parties responsible for taking corrective action.',
    categoryId: 'CC4',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC5: Control Activities
  {
    code: 'CC5.1',
    name: 'Control Selection',
    description:
      'The organization selects and develops control activities that contribute to the mitigation of risks to the achievement of objectives to acceptable levels.',
    categoryId: 'CC5',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC5.2',
    name: 'Technology Controls',
    description:
      'The organization selects and develops general control activities over technology to support the achievement of objectives.',
    categoryId: 'CC5',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC5.3',
    name: 'Policy Implementation',
    description:
      'The organization deploys control activities through policies that establish what is expected and procedures that put policies into action.',
    categoryId: 'CC5',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC6: Logical and Physical Access Controls
  {
    code: 'CC6.1',
    name: 'Access Security',
    description:
      'The organization implements logical access security software, infrastructure, and architectures over protected information assets to protect them from security events.',
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.2',
    name: 'Access Authentication',
    description:
      'Prior to issuing system credentials and granting system access, the organization registers and authorizes new internal and external users.',
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.3',
    name: 'Access Removal',
    description:
      'The organization removes access to protected information assets when appropriate.',
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.4',
    name: 'Access Review',
    description:
      'The organization evaluates and manages access to protected information assets on a periodic basis.',
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.5',
    name: 'System Account Management',
    description:
      'The organization identifies and authenticates system users, devices, and other systems before allowing access.',
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.6',
    name: 'Access Restrictions',
    description:
      'The organization restricts physical access to facilities and protected information assets.',
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.7',
    name: 'Information Asset Changes',
    description:
      'The organization manages changes to system components to minimize the risk of unauthorized changes.',
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC6.8',
    name: 'Malicious Software Prevention',
    description:
      'The organization implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software.',
    categoryId: 'CC6',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC7: System Operations
  {
    code: 'CC7.1',
    name: 'Infrastructure Monitoring',
    description:
      'To detect and act upon security events in a timely manner, the organization monitors system capacity, security threats, changing regulatory requirements, and other system vulnerabilities.',
    categoryId: 'CC7',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC7.2',
    name: 'Security Event Response',
    description:
      'The organization designs, develops, and implements policies and procedures to respond to security incidents and breaches.',
    categoryId: 'CC7',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC7.3',
    name: 'Security Event Recovery',
    description:
      'The organization implements recovery procedures to ensure timely restoration of systems or assets affected by security incidents.',
    categoryId: 'CC7',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC7.4',
    name: 'Security Event Analysis',
    description:
      'The organization implements incident response activities to identify root causes of security incidents and develop remediation plans.',
    categoryId: 'CC7',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC8: Change Management
  {
    code: 'CC8.1',
    name: 'Change Authorization',
    description:
      'The organization authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures.',
    categoryId: 'CC8',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },

  // CC9: Risk Mitigation
  {
    code: 'CC9.1',
    name: 'Business Continuity Planning',
    description:
      'The organization identifies, develops, and implements activities to recover critical information technology resources.',
    categoryId: 'CC9',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC9.2',
    name: 'Vendor Risk Management',
    description:
      'The organization assesses and manages risks associated with vendors and business partners.',
    categoryId: 'CC9',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
  {
    code: 'CC9.9',
    name: 'Business Continuity and Disaster Recovery Testing',
    description:
      'The organization tests business continuity and disaster recovery plans, evaluates the test results, and updates the plans accordingly.',
    categoryId: 'CC9',
    requiredArtifactTypes: ['policy', 'procedure', 'task'],
  },
];

export const soc2RequiredArtifacts = [];
