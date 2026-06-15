import { describe, expect, it } from 'vitest';
import { getProposalCardState } from '../proposal-card-state';

describe('getProposalCardState', () => {
  it('shows success only when completed WITH content', () => {
    expect(getProposalCardState('output-available', false, true)).toBe('done');
  });

  it('flags a completed-but-empty run as incomplete, never success (CS-256)', () => {
    expect(getProposalCardState('output-available', false, false)).toBe('incomplete');
  });

  it('flags a stopped in-progress run as interrupted', () => {
    expect(getProposalCardState('input-streaming', true, false)).toBe('interrupted');
    expect(getProposalCardState('input-available', true, true)).toBe('interrupted');
  });

  it('shows working while the tool is running and not stopped', () => {
    expect(getProposalCardState('input-streaming', false, false)).toBe('working');
  });

  it('surfaces tool errors', () => {
    expect(getProposalCardState('output-error', false, true)).toBe('error');
  });

  it('treats a completed run with content as done even if previously stopped flag set', () => {
    // Completed (output-available) overrides the stopped heuristic.
    expect(getProposalCardState('output-available', true, true)).toBe('done');
  });
});
