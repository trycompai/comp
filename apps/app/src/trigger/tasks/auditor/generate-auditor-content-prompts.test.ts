import { describe, expect, it } from 'vitest';
import {
  buildContextHubText,
  buildSectionUserPrompt,
  buildVendorsBlock,
  NARRATIVE_SECTIONS,
  sectionPrompts,
  SENSITIVE_CONTEXT_QUESTIONS,
  type VendorTabEntry,
} from './generate-auditor-content-prompts';

// Fake fixtures only — no customer data. A mix of hosting (cloud/infra),
// general SaaS, identity, and finance vendors, like a real Vendors tab.
const VENDORS: VendorTabEntry[] = [
  { name: 'AWS', description: 'Cloud hosting', category: 'cloud', website: 'https://aws.example' },
  { name: 'Vercel', description: 'App hosting', category: 'infrastructure', website: null },
  { name: 'Slack', description: 'Team chat', category: 'software_as_a_service', website: null },
  { name: 'Okta', description: 'Identity provider', category: 'software_as_a_service', website: null },
  { name: 'GitHub', description: 'Source control', category: 'software_as_a_service', website: null },
  { name: 'Stripe', description: 'Payments', category: 'finance', website: null },
];

describe('buildVendorsBlock', () => {
  it('lists EVERY vendor from the Vendors tab (CS-589: list came back too small)', () => {
    const block = buildVendorsBlock(VENDORS);

    for (const vendor of VENDORS) {
      expect(block).toContain(vendor.name);
    }
    // One line per vendor — nothing dropped.
    expect(block.split('\n')).toHaveLength(VENDORS.length);
  });

  it('does not invent entries for an empty Vendors tab', () => {
    expect(buildVendorsBlock([])).toContain('No vendors');
  });
});

describe('buildSectionUserPrompt', () => {
  it('feeds the full Vendors tab into the prompt (CS-589: the tab was never passed)', () => {
    const prompt = buildSectionUserPrompt({
      section: 'critical-vendors',
      organization: { name: 'Acme Corp', website: 'https://acme.test' },
      websiteContent: 'Acme builds widgets.',
      contextHubText: 'Q: Where do you host your applications and data?\nA: AWS',
      vendorsBlock: buildVendorsBlock(VENDORS),
    });

    expect(prompt).toContain('VENDORS TAB');
    for (const vendor of VENDORS) {
      expect(prompt).toContain(vendor.name);
    }
  });
});

describe('critical-vendors prompt', () => {
  const prompt = sectionPrompts['critical-vendors'];

  it('lists every vendor rather than narrowing to a 3-6 subset', () => {
    expect(prompt).toMatch(/every vendor/i);
    expect(prompt).not.toMatch(/3-6/);
    expect(prompt).not.toMatch(/be very selective/i);
  });

  it('uses the Vendors tab as the source of truth', () => {
    expect(prompt).toMatch(/VENDORS TAB/);
  });
});

describe('subservice-organizations prompt', () => {
  const prompt = sectionPrompts['subservice-organizations'];

  it('never includes identity / SSO providers (CS-589: identity tools were mis-listed)', () => {
    expect(prompt).toMatch(/identity/i);
    expect(prompt).toMatch(/Okta/);
    expect(prompt).toMatch(/Entra/);
    expect(prompt).toMatch(/Google Workspace/);
  });

  it('returns an empty list when no hosting provider qualifies', () => {
    expect(prompt).toMatch(/empty list/i);
  });

  it('chooses only from the Vendors tab', () => {
    expect(prompt).toMatch(/VENDORS TAB/);
  });
});

describe('buildContextHubText', () => {
  // Mirrors a real org's Context hub, including the sensitive headcount +
  // named-personnel rows (fake values only — no customer data).
  const QA = [
    { question: 'How many employees do you have?', answer: '1' },
    { question: 'Who are your C-Suite executives?', answer: 'Jane Roe — CEO' },
    {
      question: 'Who will sign off on the final report?',
      answer: 'FullName: Jane Roe\nJobTitle: CEO\nEmail: jane@example.test',
    },
    { question: 'What industry is your company in?', answer: 'SaaS' },
    { question: 'Where do you host your applications and data?', answer: 'AWS' },
    { question: 'Company Background & Overview of Operations', answer: 'prior auditor output' },
    { question: 'Which compliance frameworks do you need?', answer: 'frk_abc123' },
  ];

  it('strips headcount and named-personnel answers so they cannot leak into narrative fields (CS-589)', () => {
    const text = buildContextHubText(QA);

    // Sensitive questions and their answers are gone entirely — prompt-level
    // exclusions are not enough; the raw data must not be in the context.
    expect(text).not.toMatch(/how many employees/i);
    expect(text).not.toMatch(/c-suite/i);
    expect(text).not.toMatch(/sign off on the final report/i);
    expect(text).not.toContain('Jane Roe');
    expect(text).not.toContain('jane@example.test');

    // Non-sensitive org context still flows through.
    expect(text).toContain('What industry is your company in?');
    expect(text).toContain('SaaS');
    expect(text).toContain('Where do you host your applications and data?');
  });

  it('still excludes auditor sections and framework selection', () => {
    const text = buildContextHubText(QA);

    expect(text).not.toContain('prior auditor output');
    expect(text).not.toContain('frk_abc123');
  });

  it('keeps every SENSITIVE_CONTEXT_QUESTION out of the assembled context', () => {
    const text = buildContextHubText(
      SENSITIVE_CONTEXT_QUESTIONS.map((question) => ({ question, answer: 'SECRET_VALUE' })),
    );

    expect(text).not.toContain('SECRET_VALUE');
    expect(text).toBe('');
  });
});

describe('narrative section exclusions', () => {
  it('forbids headcount and named personnel in every narrative field (CS-589)', () => {
    for (const section of NARRATIVE_SECTIONS) {
      const prompt = sectionPrompts[section];
      expect(prompt, section).toMatch(/employees or headcount/i);
      expect(prompt, section).toMatch(/do not name any individuals/i);
    }
  });

  it('no longer asks company-background for workforce characteristics', () => {
    expect(sectionPrompts['company-background']).not.toMatch(/workforce/i);
  });
});
