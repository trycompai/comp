import { createDefaultYesResult, parseAndProcessSOAAnswer } from './soa-answer-parser';
import { DEFAULT_INCLUSION_JUSTIFICATION } from './constants';

describe('createDefaultYesResult', () => {
  const send = jest.fn();

  beforeEach(() => {
    send.mockClear();
  });

  it('always produces a non-null justification, even when closure is missing', () => {
    for (const closure of [undefined, null, '']) {
      const result = createDefaultYesResult('q1', 0, send, closure);
      expect(result.isApplicable).toBe(true);
      expect(result.justification).toBe(DEFAULT_INCLUSION_JUSTIFICATION);
    }
  });

  it('uses the family-specific justification when closure matches a named family', () => {
    const result = createDefaultYesResult('q1', 0, send, '5.15');
    expect(result.justification).not.toBeNull();
    expect(result.justification).toContain('access');
  });
});

describe('parseAndProcessSOAAnswer YES branch', () => {
  const send = jest.fn();

  beforeEach(() => {
    send.mockClear();
  });

  it('falls back to a non-null justification on YES when both the LLM and closure are empty', () => {
    const result = parseAndProcessSOAAnswer(
      'q1',
      0,
      JSON.stringify({ isApplicable: 'YES', justification: null }),
      send,
      null,
    );
    expect(result.isApplicable).toBe(true);
    expect(result.justification).toBe(DEFAULT_INCLUSION_JUSTIFICATION);
  });
});
