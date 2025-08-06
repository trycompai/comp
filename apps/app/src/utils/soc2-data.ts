export const getCommonCriteriaData = (t: (content: string) => string) => [
  {
    name: t('CC1.1 - Integrity and Ethical Values'),
    description: t(
      'Paraphrased: The entity demonstrates a commitment to integrity and ethical values.',
    ),
  },
  {
    name: t('CC1.2 - Board Independence and Oversight'),
    description: t(
      'Paraphrased: The board of directors demonstrates independence from management and oversees internal control.',
    ),
  },
  {
    name: t('CC1.3 - Organizational Structure and Reporting Lines'),
    description: t(
      'Paraphrased: Management establishes structures and reporting lines with board oversight.',
    ),
  },
  {
    name: t('CC1.4 - Commitment to Competence'),
    description: t(
      'Paraphrased: The entity attracts, develops, and retains competent individuals.',
    ),
  },
  {
    name: t('CC1.5 - Accountability'),
    description: t(
      'Paraphrased: Individuals are held accountable for their internal control responsibilities.',
    ),
  },
  {
    name: t('CC2.1 - Internal Communication'),
    description: t(
      'Paraphrased: The entity internally communicates information to support the functioning of internal control.',
    ),
  },
  {
    name: t('CC2.2 - External Communication'),
    description: t(
      'Paraphrased: The entity communicates with external parties about matters affecting internal control.',
    ),
  },
  {
    name: t('CC3.1 - Specifying Objectives'),
    description: t('Paraphrased: The entity specifies objectives to identify and assess risks.'),
  },
  {
    name: t('CC3.2 - Identifying Risks'),
    description: t('Paraphrased: The entity identifies risks to the achievement of objectives.'),
  },
  {
    name: t('CC3.3 - Fraud Risk'),
    description: t('Paraphrased: The entity considers potential for fraud in assessing risks.'),
  },
  {
    name: t('CC3.4 - Changes and Risks'),
    description: t('Paraphrased: The entity identifies changes that impact internal control.'),
  },
  {
    name: t('CC4.1 - Ongoing Monitoring'),
    description: t(
      'Paraphrased: The entity performs ongoing and/or separate evaluations of controls.',
    ),
  },
  {
    name: t('CC4.2 - Evaluation of Deficiencies'),
    description: t(
      'Paraphrased: The entity evaluates and communicates internal control deficiencies in a timely manner.',
    ),
  },
  {
    name: t('CC5.1 - Selecting Relevant Controls'),
    description: t(
      'Paraphrased: The entity selects and develops control activities to mitigate risks.',
    ),
  },
  {
    name: t('CC5.2 - General IT Controls'),
    description: t(
      'Paraphrased: The entity selects and develops general IT control activities to support objectives.',
    ),
  },
  {
    name: t('CC5.3 - Policies and Procedures'),
    description: t('Paraphrased: Control activities are deployed through policies and procedures.'),
  },
  {
    name: t('CC6.1 - Access Authorization'),
    description: t('Paraphrased: Logical and physical access is restricted to authorized users.'),
  },
  {
    name: t('CC6.2 - Authentication Mechanisms'),
    description: t(
      'Paraphrased: The entity uses authentication and authorization controls to protect assets.',
    ),
  },
  {
    name: t('CC6.3 - Remote Access and Wireless'),
    description: t('Paraphrased: The entity secures remote access and wireless technologies.'),
  },
  {
    name: t('CC6.4 - Physical Access'),
    description: t('Paraphrased: Physical access to sensitive areas is restricted.'),
  },
  {
    name: t('CC6.5 - Removal of Access'),
    description: t(
      'Paraphrased: The entity promptly removes access when it is no longer required.',
    ),
  },
  {
    name: t('CC7.1 - Detection and Monitoring'),
    description: t('Paraphrased: The entity detects and monitors system events and anomalies.'),
  },
  {
    name: t('CC7.2 - Incident Management'),
    description: t(
      'Paraphrased: The entity responds to identified security incidents to mitigate impacts.',
    ),
  },
  {
    name: t('CC7.3 - Protection from Malware'),
    description: t(
      'Paraphrased: The entity implements controls to protect against malicious software.',
    ),
  },
  {
    name: t('CC8.1 - Changes to Infrastructure, Data, and Software'),
    description: t(
      'Paraphrased: The entity authorizes and controls system changes before implementation.',
    ),
  },
  {
    name: t('CC8.2 - Emergency Changes'),
    description: t('Paraphrased: The entity manages emergency changes with documented procedures.'),
  },
  {
    name: t('CC9.1 - Mitigating Activities'),
    description: t(
      'Paraphrased: The entity identifies, selects, and develops activities to reduce risk.',
    ),
  },
  {
    name: t('CC9.2 - Vendor Management'),
    description: t(
      'Paraphrased: The entity manages third-party risks through monitoring and contractual measures.',
    ),
  },
];

export const getAvailabilityCriteriaData = (t: (content: string) => string) => [
  {
    name: t('A1.1 - Availability Commitments'),
    description: t(
      'Paraphrased: The entity maintains commitments to ensure systems are available for operation.',
    ),
  },
  {
    name: t('A1.2 - Capacity Planning'),
    description: t('Paraphrased: The entity monitors and manages system capacity to meet demands.'),
  },
  {
    name: t('A1.3 - Incident Recovery'),
    description: t(
      'Paraphrased: The entity has controls to restore system availability after incidents.',
    ),
  },
];

export const getConfCriteriaData = (t: (content: string) => string) => [
  {
    name: t('C1.1 - Confidential Information Classification'),
    description: t(
      'Paraphrased: The entity classifies information to identify and protect confidential information.',
    ),
  },
  {
    name: t('C1.2 - Access Restrictions for Confidential Data'),
    description: t(
      'Paraphrased: The entity restricts access to confidential information on a need-to-know basis.',
    ),
  },
  {
    name: t('C1.3 - Confidential Data Disposal'),
    description: t(
      'Paraphrased: The entity securely disposes of confidential information when no longer needed.',
    ),
  },
];

export const getPiCriteriaData = (t: (content: string) => string) => [
  {
    name: t('PI1.1 - Accuracy and Completeness'),
    description: t('Paraphrased: The entity ensures data is processed accurately and completely.'),
  },
  {
    name: t('PI1.2 - Input, Processing, and Output Controls'),
    description: t(
      'Paraphrased: The entity validates the completeness and accuracy of data throughout processing.',
    ),
  },
  {
    name: t('PI1.3 - Exception Handling'),
    description: t(
      'Paraphrased: The entity identifies and resolves processing exceptions in a timely manner.',
    ),
  },
];

export const getPrivacyCriteriaData = (t: (content: string) => string) => [
  {
    name: t('P1.1 - Privacy Notice'),
    description: t(
      'Paraphrased: The entity provides notice about the collection, use, and disclosure of personal information.',
    ),
  },
  {
    name: t('P1.2 - Choice and Consent'),
    description: t(
      'Paraphrased: The entity obtains consent for personal information where required by policy or law.',
    ),
  },
  {
    name: t('P1.3 - Data Retention and Disposal'),
    description: t(
      'Paraphrased: The entity retains personal information for only as long as needed and disposes of it securely.',
    ),
  },
];
