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
    const r1 = { id: 'r1', identifier: 'R1', name: 'Req 1', description: null };
    const r2 = { id: 'r2', identifier: 'R2', name: 'Req 2', description: null };
    const from = {
      ...emptyManifest(),
      requirements: [r1, r2],
      controls: [{ id: 'c1', name: 'C', description: '', requirementIds: ['r1'], policyIds: [], taskIds: [] }],
    };
    const to = {
      ...emptyManifest(),
      requirements: [r1, r2],
      controls: [{ id: 'c1', name: 'C', description: '', requirementIds: ['r2'], policyIds: [], taskIds: [] }],
    };
    const diff = diffManifests(from, to);
    expect(diff.requirementMapEdges.added).toContainEqual({ controlTemplateId: 'c1', requirementTemplateId: 'r2' });
    expect(diff.requirementMapEdges.removed).toContainEqual({ controlTemplateId: 'c1', requirementTemplateId: 'r1' });
  });

  it('reports no framework-metadata change for identical manifests', () => {
    const m = emptyManifest();
    expect(diffManifests(m, m).framework.changed).toBe(false);
  });

  it('detects a framework name change (FRAME-9)', () => {
    const from = emptyManifest();
    const to = { ...emptyManifest(), framework: { ...from.framework, name: 'New Name' } };
    const diff = diffManifests(from, to);
    expect(diff.framework.changed).toBe(true);
    expect(diff.framework.name).toEqual({ from: 'n', to: 'New Name' });
    expect(diff.framework.description).toBeUndefined();
  });

  it('detects a framework description change (FRAME-9)', () => {
    const from = { ...emptyManifest(), framework: { id: 'f', name: 'n', catalogVersion: '1', description: 'old' } };
    const to = { ...emptyManifest(), framework: { id: 'f', name: 'n', catalogVersion: '1', description: 'new' } };
    const diff = diffManifests(from, to);
    expect(diff.framework.changed).toBe(true);
    expect(diff.framework.description).toEqual({ from: 'old', to: 'new' });
    expect(diff.framework.name).toBeUndefined();
  });

  it('drops phantom edges that reference entities missing from the manifest', () => {
    // Older snapshots sometimes stored cross-framework requirement IDs in
    // control.requirementIds. Those IDs are not in manifest.requirements, so
    // the diff must ignore them rather than surface them as phantom adds or
    // removes.
    const from = {
      ...emptyManifest(),
      requirements: [],
      controls: [{ id: 'c1', name: 'C', description: '', requirementIds: ['cross_framework'], policyIds: [], taskIds: [] }],
    };
    const to = {
      ...emptyManifest(),
      requirements: [],
      controls: [{ id: 'c1', name: 'C', description: '', requirementIds: [], policyIds: [], taskIds: [] }],
    };
    const diff = diffManifests(from, to);
    expect(diff.requirementMapEdges.removed).toHaveLength(0);
    expect(diff.requirementMapEdges.added).toHaveLength(0);
  });
});
