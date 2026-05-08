import { describe, expect, it } from 'vitest';
import { getCountryLabel } from './billingPreferencesFormSchema';

describe('getCountryLabel', () => {
  it('formats the no-country sentinel with its label', () => {
    expect(getCountryLabel('none')).toBe('No country');
    expect(getCountryLabel('NONE')).toBe('No country');
  });
});
