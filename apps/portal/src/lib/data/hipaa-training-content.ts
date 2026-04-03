export const HIPAA_TRAINING_ID = 'hipaa-sat-1';

export interface HipaaTrainingSection {
  title: string;
  content: string;
}

export const hipaaTrainingSections: readonly HipaaTrainingSection[] = [
  {
    title: '1. Why this training exists',
    content: `This document supplements the organization's existing general security awareness training with HIPAA-specific expectations for protecting Protected Health Information (PHI), including electronic PHI (ePHI), paper records, and verbal disclosures.

It is intended to support onboarding and annual refresher requirements and to provide clear evidence that personnel were informed of their HIPAA security and privacy responsibilities.`,
  },
  {
    title: '2. What employees must understand',
    content: `- PHI may exist in systems, email, chat, files, paper documents, screenshots, voicemail, and verbal conversations.
- Access to PHI is permitted only for authorized job duties and only to the minimum extent necessary to perform those duties.
- PHI must not be sent, stored, printed, discussed, or shared using unapproved methods or with unauthorized people.
- Security incidents, suspected misdirected disclosures, phishing attempts, lost devices, and any possible PHI exposure must be reported immediately.`,
  },
  {
    title: '3. Required day-to-day behaviors',
    content: `**Protect PHI in all forms**
- Do not leave records, labels, printouts, or screens containing PHI unattended.
- Verify recipient names, addresses, and fax numbers before sending information.
- Use only approved storage locations, applications, and workflows for PHI.

**Email, messaging, and file sharing**
- Use approved encrypted or otherwise authorized methods when transmitting PHI.
- Do not auto-forward work email containing PHI to personal accounts.
- Do not copy PHI into public AI tools or non-approved cloud services.

**Passwords, access, and devices**
- Use unique passwords, enable multi-factor authentication where required, and never share credentials.
- Lock your screen when you step away and secure laptops and mobile devices physically.
- Report lost or stolen devices immediately, even if you are unsure whether PHI was involved.

**Phishing and social engineering**
- Treat urgent requests, payment changes, unusual login prompts, and requests for credentials or patient information as suspicious until verified.
- Use approved reporting methods to report suspicious emails, texts, calls, or pop-ups.`,
  },
  {
    title: '4. Quick reference: do / do not',
    content: `| Do | Do not |
|---|---|
| Access only the PHI needed for your role. | Browse records out of curiosity or convenience. |
| Confirm identity before sharing patient or employee information. | Discuss PHI in public areas, elevators, hallways, or on speakerphone where others can hear. |
| Use approved encrypted channels and approved repositories. | Store PHI in personal email, personal drives, USB devices, or unapproved apps. |
| Check recipients carefully before sending messages or attachments. | Rely on autofill without verifying the recipient. |
| Report incidents, phishing, lost devices, or mistakes immediately. | Delay reporting because you hope the issue will resolve on its own. |`,
  },
  {
    title: '5. Incident reporting expectation',
    content: `Report immediately if you suspect a phishing email, accidental disclosure, misdirected message, unauthorized access, malware infection, stolen or missing device, or any situation that could affect the confidentiality, integrity, or availability of PHI.

Prompt reporting matters even when you are unsure whether PHI was actually exposed. Early notice helps the organization contain risk and meet regulatory response obligations.`,
  },
] as const;

export const hipaaAcknowledgements: readonly string[] = [
  'I completed the organization\'s general security awareness training and this HIPAA Security Awareness Training Add-On.',
  'I understand that PHI includes information in electronic, paper, image, audio, and verbal form.',
  'I will access, use, disclose, transmit, and store PHI only as authorized for my job responsibilities and in accordance with organization policy.',
  'I will use approved safeguards, including strong authentication, secure handling practices, and prompt reporting of suspicious activity or incidents.',
  'I understand that failure to follow security and privacy requirements may lead to disciplinary action, up to and including termination, and may create legal or regulatory consequences.',
] as const;
