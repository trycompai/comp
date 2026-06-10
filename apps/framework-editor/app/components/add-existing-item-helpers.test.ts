import { describe, expect, it } from 'vitest';
import {
  extractApiErrorMessage,
  extractFrameworkNames,
  type ExistingItemRaw,
} from './add-existing-item-helpers';

describe('extractApiErrorMessage', () => {
  it('pulls the NestJS message field out of a JSON error body', () => {
    const error = new Error(
      JSON.stringify({ message: 'Requirement(s) not in this framework: x', statusCode: 400 }),
    );
    expect(extractApiErrorMessage(error)).toBe('Requirement(s) not in this framework: x');
  });

  it('falls back to the raw message for non-JSON errors', () => {
    expect(extractApiErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns null for non-Error / empty inputs', () => {
    expect(extractApiErrorMessage(undefined)).toBeNull();
    expect(extractApiErrorMessage(new Error(''))).toBeNull();
  });
});

describe('extractFrameworkNames', () => {
  it('collects unique framework names from linked requirements', () => {
    const item: ExistingItemRaw = {
      id: 'ct_1',
      name: 'Control',
      requirements: [
        { framework: { id: 'f1', name: 'SOC 2' } },
        { framework: { id: 'f2', name: 'ISO 27001' } },
        { framework: { id: 'f1', name: 'SOC 2' } },
      ],
    };
    expect(extractFrameworkNames(item).sort()).toEqual(['ISO 27001', 'SOC 2']);
  });

  it('also reads framework names nested under controlTemplates', () => {
    const item: ExistingItemRaw = {
      id: 'p_1',
      name: 'Policy',
      controlTemplates: [
        { id: 'ct', name: 'C', requirements: [{ framework: { id: 'f', name: 'HIPAA' } }] },
      ],
    };
    expect(extractFrameworkNames(item)).toEqual(['HIPAA']);
  });

  it('returns an empty array when there are no framework links', () => {
    expect(extractFrameworkNames({ id: 'x', name: 'X' })).toEqual([]);
  });
});
