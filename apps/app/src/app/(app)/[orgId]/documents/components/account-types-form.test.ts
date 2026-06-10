import { describe, expect, it } from 'vitest';
import {
  evidenceFormDefinitions,
  evidenceFormSubmissionSchemaMap,
} from '@/app/(app)/[orgId]/documents/forms';

const schema = evidenceFormSubmissionSchemaMap['account-types'];
const definition = evidenceFormDefinitions['account-types'];

function submission(rows: Array<Record<string, string>>) {
  return { submissionDate: '2026-06-10', accountTypeRows: rows };
}

describe('account-types document type definition', () => {
  it('has the requested title and intro', () => {
    expect(definition.title).toBe('New Account Types Submission');
    expect(definition.description).toBe('Document allowed Account types, with justification.');
  });

  it('is hidden + optional so it stays out of the global browse list and scores', () => {
    // NIST-specific: must not appear in every org's Documents browse list
    // (hidden) and must not change the org-wide expected-documents score
    // (the scorers count `!hidden && !optional`). It is still reachable and
    // counted via any control it is explicitly linked to.
    expect(definition.hidden).toBe(true);
    expect(definition.optional).toBe(true);
  });

  it('exposes an Allowed/Disallowed dropdown column and a justification column', () => {
    const matrix = definition.fields.find((f) => f.type === 'matrix');
    const columns = matrix?.columns ?? [];
    const status = columns.find((c) => c.key === 'status');
    expect(status?.type).toBe('select');
    expect(status?.options?.map((o) => o.value)).toEqual(['Allowed', 'Disallowed']);
    expect(columns.map((c) => c.key)).toEqual(['accountType', 'status', 'justification']);
  });

  it('ships the 10 default rows from the spec, pre-filled correctly', () => {
    const matrix = definition.fields.find((f) => f.type === 'matrix');
    const rows = matrix?.defaultRows ?? [];
    expect(rows).toHaveLength(10);
    expect(rows[0]).toMatchObject({
      accountType: 'Individual',
      status: 'Allowed',
      justification: 'Needed by each employee/worker',
    });
    expect(rows.find((r) => r.accountType === 'Developer')).toMatchObject({
      status: 'Disallowed',
      justification: '',
    });
    // Every Allowed default row carries a justification (so defaults pass validation).
    for (const row of rows) {
      if (row.status === 'Allowed') expect(row.justification.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('account-types conditional validation', () => {
  it('accepts the shipped default rows as-is', () => {
    const matrix = definition.fields.find((f) => f.type === 'matrix');
    const rows = [...(matrix?.defaultRows ?? [])];
    expect(schema.safeParse(submission(rows)).success).toBe(true);
  });

  it('requires a justification when a row is Allowed', () => {
    const result = schema.safeParse(
      submission([{ accountType: 'Contractor', status: 'Allowed', justification: '' }]),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('justification'));
      expect(issue?.message).toMatch(/justification is required/i);
    }
  });

  it('allows a blank justification when a row is Disallowed', () => {
    const result = schema.safeParse(
      submission([{ accountType: 'Guest account', status: 'Disallowed', justification: '' }]),
    );
    expect(result.success).toBe(true);
  });

  it('rejects a status that is neither Allowed nor Disallowed', () => {
    const result = schema.safeParse(
      submission([{ accountType: 'Weird', status: 'Maybe', justification: '' }]),
    );
    expect(result.success).toBe(false);
  });

  it('requires at least one filled account-type row', () => {
    const result = schema.safeParse(
      submission([{ accountType: '', status: '', justification: '' }]),
    );
    expect(result.success).toBe(false);
  });
});
