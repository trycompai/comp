jest.mock('ai', () => ({ generateObject: jest.fn() }));
jest.mock('@ai-sdk/anthropic', () => ({ anthropic: jest.fn(() => 'anthropic-model') }));

import { generateObject } from 'ai';
import type { CheckResultRow } from './check-results.service';
import {
  EvidenceExtractionService,
  evidenceMentionsEmail,
  extractDeterministic,
} from './evidence-extraction.service';

function row(partial: Partial<CheckResultRow>): CheckResultRow {
  return {
    resourceId: 'org',
    resourceType: 'organization',
    passed: true,
    title: 'Access List',
    description: null,
    evidence: null,
    collectedAt: new Date('2026-07-01T00:00:00Z'),
    runId: 'run_1',
    connectionId: 'conn_1',
    ...partial,
  };
}

const EMAIL = 'jane@x.com';
const PURPOSE = 'employee access: roles, permissions';
const generateObjectMock = generateObject as jest.Mock;

describe('extractDeterministic', () => {
  it('matches per-user rows by email, case-insensitively (shape A)', () => {
    const entries = extractDeterministic(
      [
        row({
          resourceType: 'user',
          resourceId: 'Jane@X.com',
          title: 'Jane has access',
          evidence: { role: 'Editor', lastLogin: '2026-06-30' },
        }),
        row({ resourceType: 'user', resourceId: 'bob@x.com', evidence: { role: 'Owner' } }),
      ],
      EMAIL,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].summary).toBe('Editor');
    expect(entries[0].fields).toMatchObject({ Role: 'Editor', 'Last login': '2026-06-30' });
    expect(entries[0].source).toBe('deterministic');
  });

  it('digs the member out of roster arrays in org-level evidence (shape B)', () => {
    const entries = extractDeterministic(
      [
        row({
          evidence: {
            totalUsers: 2,
            employees: [
              {
                primaryEmail: 'JANE@x.com',
                role: 'Super Admin',
                roles: ['Super Admin'],
                isAdmin: true,
                suspended: false,
              },
              { primaryEmail: 'bob@x.com', role: 'User' },
            ],
          },
        }),
      ],
      EMAIL,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].summary).toBe('Super Admin');
    expect(entries[0].fields).toMatchObject({
      Role: 'Super Admin',
      Admin: 'true',
      Suspended: 'false',
    });
    // Raw record preserved for the details view.
    expect(entries[0].raw).toMatchObject({ primaryEmail: 'JANE@x.com' });
  });

  it('returns nothing when the source keys users some other way (e.g. logins)', () => {
    const entries = extractDeterministic(
      [row({ resourceType: 'user', resourceId: 'jane-gh-login', evidence: { role: 'admin' } })],
      EMAIL,
    );
    expect(entries).toEqual([]);
  });

  it('tolerates malformed evidence without throwing', () => {
    const entries = extractDeterministic(
      [
        row({ evidence: 'just a string' }),
        row({ evidence: { employees: 'not-an-array' } }),
        row({ evidence: { users: [null, 42, { noEmail: true }] } }),
      ],
      EMAIL,
    );
    expect(entries).toEqual([]);
  });
});

describe('evidenceMentionsEmail', () => {
  it('finds the email anywhere in the serialized evidence, case-insensitively', () => {
    const results = [row({ evidence: { grants: [{ grantee: 'mailto:JANE@X.COM' }] } })];
    expect(evidenceMentionsEmail(results, EMAIL)).toBe(true);
  });

  it('is false when the email appears nowhere', () => {
    const results = [row({ evidence: { users: [{ email: 'bob@x.com' }] } })];
    expect(evidenceMentionsEmail(results, EMAIL)).toBe(false);
  });
});

describe('EvidenceExtractionService.extractPersonEntries', () => {
  const service = new EvidenceExtractionService();
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    generateObjectMock.mockReset();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it('prefers the deterministic pass and never calls the AI', async () => {
    const out = await service.extractPersonEntries({
      results: [row({ resourceType: 'user', resourceId: EMAIL, evidence: { role: 'Editor' } })],
      email: EMAIL,
      purpose: PURPOSE,
    });

    expect(out.status).toBe('found');
    expect(out.entries[0].source).toBe('deterministic');
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it('returns not-found without an AI call when the email is nowhere in the evidence', async () => {
    const out = await service.extractPersonEntries({
      results: [row({ evidence: { users: [{ email: 'bob@x.com' }] } })],
      email: EMAIL,
      purpose: PURPOSE,
    });

    expect(out).toEqual({ status: 'not-found', entries: [] });
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it('returns not-found for empty results and blank email without an AI call', async () => {
    await expect(
      service.extractPersonEntries({ results: [], email: EMAIL, purpose: PURPOSE }),
    ).resolves.toEqual({ status: 'not-found', entries: [] });
    await expect(
      service.extractPersonEntries({
        results: [row({})],
        email: '   ',
        purpose: PURPOSE,
      }),
    ).resolves.toEqual({ status: 'not-found', entries: [] });
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it('falls back to the AI for unknown shapes and labels the entries', async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        found: true,
        entries: [{ summary: 'Editor seat', fields: { Role: 'Editor' } }],
      },
    });

    const out = await service.extractPersonEntries({
      // Unknown shape: email is nested under a key the deterministic pass ignores.
      results: [row({ evidence: { seatAssignments: { 'jane@x.com': { level: 'Editor' } } } })],
      email: EMAIL,
      purpose: PURPOSE,
    });

    expect(out.status).toBe('found');
    expect(out.entries).toEqual([
      { summary: 'Editor seat', fields: { Role: 'Editor' }, raw: null, source: 'ai' },
    ]);
    // The prompt carries the purpose, the email, and only email-relevant evidence.
    const prompt = generateObjectMock.mock.calls[0][0].prompt as string;
    expect(prompt).toContain(PURPOSE);
    expect(prompt).toContain(EMAIL);
    expect(prompt).toContain('seatAssignments');
  });

  it('treats an AI found=false as a verified not-found', async () => {
    generateObjectMock.mockResolvedValue({ object: { found: false, entries: [] } });

    const out = await service.extractPersonEntries({
      results: [row({ evidence: { auditTrail: `removed jane@x.com from workspace` } })],
      email: EMAIL,
      purpose: PURPOSE,
    });

    expect(out).toEqual({ status: 'not-found', entries: [] });
  });

  it('degrades to unparsed when the AI call fails', async () => {
    generateObjectMock.mockRejectedValue(new Error('rate limited'));

    const out = await service.extractPersonEntries({
      results: [row({ evidence: { seatAssignments: { 'jane@x.com': {} } } })],
      email: EMAIL,
      purpose: PURPOSE,
    });

    expect(out).toEqual({ status: 'unparsed', entries: [] });
  });

  it('degrades to unparsed without calling the AI when no API key is configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const out = await service.extractPersonEntries({
      results: [row({ evidence: { seatAssignments: { 'jane@x.com': {} } } })],
      email: EMAIL,
      purpose: PURPOSE,
    });

    expect(out).toEqual({ status: 'unparsed', entries: [] });
    expect(generateObjectMock).not.toHaveBeenCalled();
  });
});
