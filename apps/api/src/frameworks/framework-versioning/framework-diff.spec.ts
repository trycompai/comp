import { diffManifests } from './framework-diff';
import type { FrameworkManifest } from './manifest.types';

function emptyManifest(): FrameworkManifest {
  return {
    framework: { id: 'f', name: 'n', catalogVersion: '1', description: null },
    requirements: [],
    controls: [],
    policies: [],
    tasks: [],
  };
}

describe('diffManifests', () => {
  it('returns empty diff for identical manifests', () => {
    const m = emptyManifest();
    const diff = diffManifests(m, m);
    expect(diff.controls.added).toHaveLength(0);
    expect(diff.controls.removed).toHaveLength(0);
    expect(diff.controls.updated).toHaveLength(0);
    expect(diff.requirements.added).toHaveLength(0);
    expect(diff.policies.added).toHaveLength(0);
    expect(diff.tasks.added).toHaveLength(0);
  });

  it('detects added controls', () => {
    const from = emptyManifest();
    const to = { ...emptyManifest(), controls: [{ id: 'c1', name: 'C1', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] };
    const diff = diffManifests(from, to);
    expect(diff.controls.added).toEqual([to.controls[0]]);
  });

  it('detects removed requirements', () => {
    const from = { ...emptyManifest(), requirements: [{ id: 'r1', identifier: 'CC1.1', name: 'x', description: null }] };
    const to = emptyManifest();
    const diff = diffManifests(from, to);
    expect(diff.requirements.removed.map((r) => r.id)).toEqual(['r1']);
  });

  it('detects updated policies by content change', () => {
    const from = { ...emptyManifest(), policies: [{ id: 'p1', name: 'P', description: 'old', content: [], frequency: null, department: null }] };
    const to = { ...emptyManifest(), policies: [{ id: 'p1', name: 'P', description: 'new', content: [], frequency: null, department: null }] };
    const diff = diffManifests(from, to);
    expect(diff.policies.updated).toHaveLength(1);
    expect(diff.policies.updated[0].id).toBe('p1');
    expect(diff.policies.updated[0].from.description).toBe('old');
    expect(diff.policies.updated[0].to.description).toBe('new');
  });

  it('detects updated requirement-map edges when control→requirement links change', () => {
    const from = { ...emptyManifest(), controls: [{ id: 'c1', name: 'C', description: '', requirementIds: ['r1'], policyIds: [], taskIds: [] }] };
    const to = { ...emptyManifest(), controls: [{ id: 'c1', name: 'C', description: '', requirementIds: ['r2'], policyIds: [], taskIds: [] }] };
    const diff = diffManifests(from, to);
    expect(diff.requirementMapEdges.added).toContainEqual({ controlTemplateId: 'c1', requirementTemplateId: 'r2' });
    expect(diff.requirementMapEdges.removed).toContainEqual({ controlTemplateId: 'c1', requirementTemplateId: 'r1' });
  });
});
