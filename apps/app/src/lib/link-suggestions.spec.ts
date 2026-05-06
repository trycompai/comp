import { Departments } from '@db';
import { describe, expect, it } from 'vitest';
import { linkSuggestions, type Candidate } from './link-suggestions';

const candidate = (
  id: string,
  score: number,
  department?: Departments,
): Candidate => ({ id, score, department });

describe('linkSuggestions', () => {
  it('returns empty when candidates is empty', () => {
    expect(linkSuggestions({ source: { department: Departments.it }, candidates: [] })).toEqual(
      [],
    );
  });

  it('drops candidates below threshold', () => {
    const result = linkSuggestions({
      source: {},
      candidates: [
        candidate('a', 0.9),
        candidate('b', 0.5),
        candidate('c', 0.3),
      ],
      threshold: 0.65,
    });
    expect(result.map((r) => r.id)).toEqual(['a']);
  });

  it('caps results at topK', () => {
    const result = linkSuggestions({
      source: {},
      candidates: [
        candidate('a', 0.95),
        candidate('b', 0.94),
        candidate('c', 0.93),
        candidate('d', 0.92),
        candidate('e', 0.91),
        candidate('f', 0.90),
        candidate('g', 0.89),
      ],
      threshold: 0.65,
      topK: 5,
    });
    expect(result).toHaveLength(5);
    expect(result.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('boosts candidates whose department matches source department', () => {
    // Without boost, b would beat a (0.66 > 0.62).
    // With boost (a matches), a's effective score becomes 0.62 + 0.05 = 0.67, beating b.
    const result = linkSuggestions({
      source: { department: Departments.hr },
      candidates: [
        candidate('a', 0.62, Departments.hr),
        candidate('b', 0.66, Departments.it),
      ],
      threshold: 0.6,
      topK: 2,
      departmentBoost: 0.05,
    });
    expect(result.map((r) => r.id)).toEqual(['a', 'b']);
    expect(result[0].score).toBeCloseTo(0.67, 2);
  });

  it('does not boost when source department is unset', () => {
    const result = linkSuggestions({
      source: {},
      candidates: [
        candidate('a', 0.6, Departments.hr),
        candidate('b', 0.7, Departments.it),
      ],
      threshold: 0.5,
      topK: 2,
      departmentBoost: 0.05,
    });
    expect(result[0].id).toBe('b');
    expect(result[0].score).toBeCloseTo(0.7, 2);
  });

  it('does not boost when candidate department is "none" (default Task value)', () => {
    // Source department `none` matches a candidate `none` literally — but
    // the boost rule excludes `none` explicitly so the boost should NOT
    // apply. Without the exclusion, the candidate at 0.62 would beat the
    // one at 0.66 (0.62 + 0.05 > 0.66). Asserting the un-boosted candidate
    // wins is what proves the rule. (Cubic finding #24 on PR #2671.)
    const result = linkSuggestions({
      source: { department: Departments.none },
      candidates: [
        candidate('a', 0.62, Departments.none),
        candidate('b', 0.66, Departments.it),
      ],
      threshold: 0.5,
      topK: 2,
      departmentBoost: 0.05,
    });
    expect(result[0].id).toBe('b');
    expect(result[0].score).toBeCloseTo(0.66, 2);
    expect(result[1].id).toBe('a');
    expect(result[1].score).toBeCloseTo(0.62, 2);
  });

  it('returns results sorted by descending boosted score', () => {
    const result = linkSuggestions({
      source: { department: Departments.hr },
      candidates: [
        candidate('a', 0.7),
        candidate('b', 0.62, Departments.hr),
        candidate('c', 0.85),
      ],
      threshold: 0.5,
      topK: 5,
      departmentBoost: 0.05,
    });
    expect(result.map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('uses sensible defaults when threshold/topK/boost omitted', () => {
    // Defaults: threshold=0.65, topK=5, departmentBoost=0.05.
    const result = linkSuggestions({
      source: { department: Departments.hr },
      candidates: [
        candidate('a', 0.7),
        candidate('b', 0.5),
      ],
    });
    expect(result.map((r) => r.id)).toEqual(['a']);
  });
});
