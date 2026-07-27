import { describe, expect, it } from 'vitest';
import type { DraftDiff } from '../hooks/useFrameworkDraftDiff';
import { hasAnyChanges } from './VersionDiffView';

function emptyDiff(): DraftDiff['diff'] {
  const entity = { added: [], removed: [], updated: [] };
  const edge = { added: [], removed: [] };
  return {
    controls: entity,
    requirements: entity,
    policies: entity,
    tasks: entity,
    requirementMapEdges: edge,
    controlPolicyEdges: edge,
    controlTaskEdges: edge,
    controlDocumentTypeEdges: edge,
  };
}

describe('hasAnyChanges', () => {
  it('is false for an empty diff', () => {
    expect(hasAnyChanges(emptyDiff())).toBe(false);
  });

  // FRAME-9: a name/description-only edit must count as a change so Publish
  // doesn't stay greyed out with "no changes detected".
  it('is true when only the framework name changed', () => {
    const diff = { ...emptyDiff(), framework: { changed: true, name: { from: 'A', to: 'B' } } };
    expect(hasAnyChanges(diff)).toBe(true);
  });

  it('is true when only the framework description changed', () => {
    const diff = {
      ...emptyDiff(),
      framework: { changed: true, description: { from: 'old', to: 'new' } },
    };
    expect(hasAnyChanges(diff)).toBe(true);
  });

  it('is false when framework.changed is false', () => {
    const diff = { ...emptyDiff(), framework: { changed: false } };
    expect(hasAnyChanges(diff)).toBe(false);
  });

  it('still detects entity changes (sanity)', () => {
    const diff = emptyDiff();
    diff.controls = { added: [{ id: 'c1', name: 'C1' }], removed: [], updated: [] };
    expect(hasAnyChanges(diff)).toBe(true);
  });
});
