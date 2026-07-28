import { describe, expect, it } from 'vitest';
import { footerAction, footerButtonLabel, footerDisabled } from './surface-ui';

describe('docs footer', () => {
  it('offers the copy action', () => {
    expect(footerAction('docs')).toBe('copy-answers');
  });

  it('is enabled once answers exist', () => {
    expect(footerDisabled({ approved: 0, answerCount: 3, surface: 'docs' })).toBe('');
  });

  it('stays disabled while there is nothing to copy', () => {
    expect(footerDisabled({ approved: 0, answerCount: 0, surface: 'docs' })).toBe('disabled');
  });

  it('does not require approvals, which docs has no path to collect', () => {
    expect(footerDisabled({ approved: 0, answerCount: 1, surface: 'docs' })).toBe('');
  });

  it('labels the button as a copy rather than an insert', () => {
    expect(footerButtonLabel({ approved: 0, answerCount: 2, surface: 'docs' }))
      .toBe('Copy 2 answers');
    expect(footerButtonLabel({ approved: 0, answerCount: 0, surface: 'docs' }))
      .toBe('Generate answers to copy');
  });
});

describe('generic footer', () => {
  it('still gates on approvals', () => {
    expect(footerAction('generic')).toBe('insert-approved');
    expect(footerDisabled({ approved: 0, answerCount: 5, surface: 'generic' })).toBe('disabled');
    expect(footerDisabled({ approved: 2, answerCount: 5, surface: 'generic' })).toBe('');
    expect(footerButtonLabel({ approved: 2, answerCount: 5, surface: 'generic' }))
      .toBe('Insert 2 approved');
  });
});
