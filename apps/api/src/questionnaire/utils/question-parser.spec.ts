jest.mock('@ai-sdk/openai', () => ({ openai: jest.fn() }));
jest.mock('ai', () => ({
  generateObject: jest.fn(),
  jsonSchema: jest.fn((s) => s),
}));

import {
  looksLikeQuestionLine,
  buildQuestionAwareChunks,
  estimateQuestionCount,
} from './question-parser';

const CHUNK_OPTS = {
  maxChunkChars: 80_000,
  minChunkChars: 5_000,
  maxQuestionsPerChunk: 1,
};

describe('looksLikeQuestionLine', () => {
  describe('existing patterns (regression guard)', () => {
    it('detects question marks', () => {
      expect(looksLikeQuestionLine('Do you have a security policy?')).toBe(
        true,
      );
      expect(looksLikeQuestionLine('Company Name：何ですか？')).toBe(true);
    });

    it('detects "Question:" labels', () => {
      expect(looksLikeQuestionLine('[Question] SQ14.3')).toBe(false);
      expect(
        looksLikeQuestionLine('Question: Do you encrypt data at rest'),
      ).toBe(true);
      expect(looksLikeQuestionLine('question : Describe your BCP')).toBe(true);
    });

    it('detects explicit question/Q prefix', () => {
      expect(looksLikeQuestionLine('Q1. What is your data retention?')).toBe(
        true,
      );
      expect(looksLikeQuestionLine('Question 5: Describe controls')).toBe(true);
    });

    it('detects interrogative-starting lines', () => {
      expect(
        looksLikeQuestionLine('What security certifications do you hold'),
      ).toBe(true);
      expect(
        looksLikeQuestionLine('How do you handle data breaches'),
      ).toBe(true);
      expect(looksLikeQuestionLine('Is data encrypted in transit')).toBe(true);
      expect(looksLikeQuestionLine('Are backups tested regularly')).toBe(true);
      expect(looksLikeQuestionLine('Does the company have SOC 2')).toBe(true);
      expect(looksLikeQuestionLine('Can users export their data')).toBe(true);
      expect(
        looksLikeQuestionLine('Describe your incident response plan'),
      ).toBe(true);
      expect(looksLikeQuestionLine('List all subprocessors')).toBe(true);
    });

    it('detects numbered questions with interrogatives', () => {
      expect(looksLikeQuestionLine('06. Do you have a BCP?')).toBe(true);
      expect(looksLikeQuestionLine('1) What is your uptime SLA')).toBe(true);
      expect(looksLikeQuestionLine('Q1: How do you handle PII')).toBe(true);
    });

    it('detects form-style numbered fields', () => {
      expect(looksLikeQuestionLine('1.1 Vendor Name')).toBe(true);
      expect(looksLikeQuestionLine('2.3 Contact Email')).toBe(true);
      expect(looksLikeQuestionLine('1.4 Company Address')).toBe(true);
    });

    it('detects required markers', () => {
      expect(looksLikeQuestionLine('Company legal name *')).toBe(true);
    });

    it('detects selection notes', () => {
      expect(
        looksLikeQuestionLine(
          'Primary data center location (Single selection allowed)',
        ),
      ).toBe(true);
      expect(
        looksLikeQuestionLine(
          'Which certifications (Multiple selections allowed)',
        ),
      ).toBe(true);
    });

    it('rejects empty lines and pure metadata', () => {
      expect(looksLikeQuestionLine('')).toBe(false);
      expect(looksLikeQuestionLine('   ')).toBe(false);
    });
  });

  describe('compliance-statement patterns (new)', () => {
    it('detects "The organization" statements', () => {
      expect(
        looksLikeQuestionLine(
          'The organization must determine the respective roles and responsibilities',
        ),
      ).toBe(true);
      expect(
        looksLikeQuestionLine(
          'The organization has entered into a contract with the PII data controller',
        ),
      ).toBe(true);
      expect(
        looksLikeQuestionLine(
          'The organization ensures that temporary files are deleted',
        ),
      ).toBe(true);
      expect(
        looksLikeQuestionLine(
          'The organization conducts a risk analysis regarding PII processing',
        ),
      ).toBe(true);
      expect(
        looksLikeQuestionLine(
          'The organization implements procedures and technical solutions',
        ),
      ).toBe(true);
    });

    it('detects "The company/vendor/supplier" statements', () => {
      expect(
        looksLikeQuestionLine(
          'The company maintains a processing register for compliance',
        ),
      ).toBe(true);
      expect(
        looksLikeQuestionLine(
          'The vendor provides the data controller with appropriate information',
        ),
      ).toBe(true);
      expect(
        looksLikeQuestionLine(
          'The supplier has defined policies for managing data subject requests',
        ),
      ).toBe(true);
    });

    it('detects "Our organization/company/team" statements', () => {
      expect(
        looksLikeQuestionLine(
          'Our organization maintains SOC 2 Type II certification',
        ),
      ).toBe(true);
      expect(
        looksLikeQuestionLine('Our company encrypts all data at rest'),
      ).toBe(true);
      expect(
        looksLikeQuestionLine('Our team conducts quarterly security reviews'),
      ).toBe(true);
    });

    it('does NOT match ambiguous "We X" lines (could be answers)', () => {
      expect(
        looksLikeQuestionLine('We retain data for 90 days.'),
      ).toBe(false);
      expect(
        looksLikeQuestionLine('We follow our IRP documented in SOC 2.'),
      ).toBe(false);
    });

    it('does NOT false-positive on section headers and metadata', () => {
      expect(
        looksLikeQuestionLine('Information Security Program'),
      ).toBe(false);
      expect(looksLikeQuestionLine('General Information')).toBe(false);
      expect(looksLikeQuestionLine('Section 2: Data Protection')).toBe(false);
      expect(looksLikeQuestionLine('Acme Corp')).toBe(false);
      expect(looksLikeQuestionLine('2026-01-15')).toBe(false);
      expect(looksLikeQuestionLine('Version 3.0')).toBe(false);
      expect(looksLikeQuestionLine('Confidential')).toBe(false);
    });

    it('handles case-insensitive matching', () => {
      expect(
        looksLikeQuestionLine('THE ORGANIZATION MUST PROVIDE EVIDENCE'),
      ).toBe(true);
      expect(
        looksLikeQuestionLine('the organization supports the data controller'),
      ).toBe(true);
    });
  });
});

describe('buildQuestionAwareChunks', () => {
  it('returns empty for empty input', () => {
    expect(buildQuestionAwareChunks('', CHUNK_OPTS)).toEqual([]);
    expect(buildQuestionAwareChunks('   ', CHUNK_OPTS)).toEqual([]);
  });

  it('chunks interrogative questions one per chunk', () => {
    const content = [
      'What is your data retention policy?',
      'We retain data for 90 days.',
      'How do you handle security incidents?',
      'We follow our IRP documented in SOC 2.',
      'Do you encrypt data at rest?',
      'Yes, AES-256.',
    ].join('\n');

    const chunks = buildQuestionAwareChunks(content, CHUNK_OPTS);
    expect(chunks.length).toBe(3);
    expect(chunks[0].content).toContain('data retention policy');
    expect(chunks[1].content).toContain('security incidents');
    expect(chunks[2].content).toContain('encrypt data at rest');
  });

  it('chunks compliance statements one per chunk', () => {
    const content = [
      'The organization must determine roles and responsibilities for PII processing.',
      'The organization has entered into a contract with the PII data controller.',
      'The organization conducts a risk analysis regarding PII processing.',
    ].join('\n');

    const chunks = buildQuestionAwareChunks(content, CHUNK_OPTS);
    expect(chunks.length).toBe(3);
    expect(chunks[0].content).toContain('roles and responsibilities');
    expect(chunks[1].content).toContain('entered into a contract');
    expect(chunks[2].content).toContain('risk analysis');
  });

  it('handles mixed interrogative + compliance content', () => {
    const content = [
      'The organization must have documented procedures for PII deletion.',
      'How often do you review your data retention policies?',
      'The organization ensures temporary files are deleted.',
      'Do you have a DPIA process?',
    ].join('\n');

    const chunks = buildQuestionAwareChunks(content, CHUNK_OPTS);
    expect(chunks.length).toBe(4);
  });

  it('keeps non-question context lines with the preceding question', () => {
    const content = [
      'What is your encryption standard?',
      'Please provide details about key management.',
      'Additional notes on rotation schedule.',
      'How do you handle key rotation?',
    ].join('\n');

    const chunks = buildQuestionAwareChunks(content, CHUNK_OPTS);
    expect(chunks.length).toBe(2);
    expect(chunks[0].content).toContain('key management');
    expect(chunks[0].content).toContain('rotation schedule');
    expect(chunks[1].content).toContain('key rotation');
  });

  it('falls back to single chunk when no patterns match', () => {
    const content = [
      'Acme Corp Security Assessment',
      'Prepared by: John Smith',
      'Date: 2026-01-15',
      'Version 3.0',
    ].join('\n');

    const chunks = buildQuestionAwareChunks(content, CHUNK_OPTS);
    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toContain('Acme Corp');
  });
});

describe('estimateQuestionCount', () => {
  it('counts question marks when present', () => {
    expect(
      estimateQuestionCount('Q1? Q2? Q3?'),
    ).toBe(3);
  });

  it('counts lines matching looksLikeQuestionLine when no question marks', () => {
    const text = [
      'The organization must have a BCP.',
      'The organization ensures data is encrypted.',
      'Section header',
    ].join('\n');
    expect(estimateQuestionCount(text)).toBe(2);
  });

  it('uses fallback heuristic for unrecognized content', () => {
    const text = 'a'.repeat(3600);
    expect(estimateQuestionCount(text)).toBe(3);
  });
});
