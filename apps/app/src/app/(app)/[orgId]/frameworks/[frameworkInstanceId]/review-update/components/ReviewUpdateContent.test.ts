import type { ManifestControl } from '@/types/framework-versioning';
import { describe, expect, it } from 'vitest';
import { describeControlChanges } from './ReviewUpdateContent';

function makeManifest(overrides: Partial<ManifestControl> = {}): ManifestControl {
  return {
    id: 'mc_1',
    name: 'Control A',
    description: 'Desc A',
    controlFamily: null,
    requirementIds: [],
    policyIds: [],
    taskIds: [],
    ...overrides,
  };
}

describe('describeControlChanges', () => {
  it('returns "Control family set to X" when family added', () => {
    const from = makeManifest({ controlFamily: null });
    const to = makeManifest({ controlFamily: 'Access Control' });

    expect(describeControlChanges(from, to)).toBe(
      'Control family set to "Access Control"',
    );
  });

  it('returns "Control family removed" when family removed', () => {
    const from = makeManifest({ controlFamily: 'Audit' });
    const to = makeManifest({ controlFamily: null });

    expect(describeControlChanges(from, to)).toBe('Control family removed');
  });

  it('returns "Control family changed from X to Y" when family renamed', () => {
    const from = makeManifest({ controlFamily: 'Audit' });
    const to = makeManifest({ controlFamily: 'Logging' });

    expect(describeControlChanges(from, to)).toBe(
      'Control family changed from "Audit" to "Logging"',
    );
  });

  it('returns "Name updated" when name changes', () => {
    const from = makeManifest({ name: 'Old Name' });
    const to = makeManifest({ name: 'New Name' });

    expect(describeControlChanges(from, to)).toBe('Name updated');
  });

  it('returns combined message when multiple fields change', () => {
    const from = makeManifest({ name: 'Old', controlFamily: null });
    const to = makeManifest({ name: 'New', controlFamily: 'AC' });

    expect(describeControlChanges(from, to)).toBe(
      'Name updated. Control family set to "AC"',
    );
  });

  it('returns "Description updated" when only description changes', () => {
    const from = makeManifest({ description: 'Old desc' });
    const to = makeManifest({ description: 'New desc' });

    expect(describeControlChanges(from, to)).toBe('Description updated');
  });

  it('returns "Modified" when nothing visibly changed', () => {
    const manifest = makeManifest();

    expect(describeControlChanges(manifest, manifest)).toBe('Modified');
  });

  it('treats undefined controlFamily the same as null', () => {
    const from = makeManifest({ controlFamily: undefined });
    const to = makeManifest({ controlFamily: 'Security' });

    expect(describeControlChanges(from, to)).toBe(
      'Control family set to "Security"',
    );
  });
});
