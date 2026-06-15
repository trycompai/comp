import { describe, expect, it } from 'vitest';
import { buildFormValues, LEADERSHIP_COMMITMENTS } from './leadership-schema';

describe('buildFormValues', () => {
  it('renders all eight canonical (a)-(h) rows in a stable order even when empty', () => {
    const values = buildFormValues(null);

    expect(values.statement).toBe('');
    expect(values.commitments.map((c) => c.key)).toEqual(
      LEADERSHIP_COMMITMENTS.map((meta) => meta.key),
    );
    expect(values.commitments.every((c) => c.text === '')).toBe(true);
  });

  it('fills canonical rows from the persisted narrative', () => {
    const values = buildFormValues({
      statement: 'We are committed.',
      commitments: [
        { key: 'a', text: 'Policy aligned' },
        { key: 'c', text: 'Resources available' },
      ],
    });

    expect(values.statement).toBe('We are committed.');
    expect(values.commitments.find((c) => c.key === 'a')?.text).toBe('Policy aligned');
    expect(values.commitments.find((c) => c.key === 'b')?.text).toBe('');
    expect(values.commitments.find((c) => c.key === 'c')?.text).toBe('Resources available');
  });

  it('preserves persisted commitments beyond the canonical a-h set (e.g. Deputy SPO key "i")', () => {
    const values = buildFormValues({
      statement: 'Statement',
      commitments: [
        { key: 'a', text: 'Policy aligned' },
        { key: 'i', text: 'Deputy SPO appointed' },
      ],
    });

    // Canonical rows still come first, in order.
    expect(values.commitments.slice(0, LEADERSHIP_COMMITMENTS.length).map((c) => c.key)).toEqual(
      LEADERSHIP_COMMITMENTS.map((meta) => meta.key),
    );

    // The extra 'i' commitment survives the round-trip instead of being dropped.
    const deputy = values.commitments.find((c) => c.key === 'i');
    expect(deputy).toBeDefined();
    expect(deputy?.text).toBe('Deputy SPO appointed');
  });
});
