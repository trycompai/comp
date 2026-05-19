import { buildUpdatePreview } from './framework-update-preview';
import type { FrameworkManifest } from './manifest.types';

const empty: FrameworkManifest = {
  framework: { id: 'f', name: 'n', catalogVersion: '1', description: null },
  requirements: [], controls: [], policies: [], tasks: [],
};
const labels = {
  fromVersionLabel: { id: 'fvr_1', version: '1.0.0' },
  toVersionLabel: { id: 'fvr_2', version: '1.1.0' },
};

describe('buildUpdatePreview', () => {
  it('classifies added control', () => {
    const preview = buildUpdatePreview({
      fromManifest: empty,
      toManifest: { ...empty, controls: [{ id: 'c1', name: 'C', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] },
      instanceControls: [],
      instanceTasks: [],
      instancePolicies: [],
      ...labels,
    });
    expect(preview.controls.added).toHaveLength(1);
    expect(preview.controls.archived).toHaveLength(0);
  });

  it('classifies removed control as archived', () => {
    const preview = buildUpdatePreview({
      fromManifest: { ...empty, controls: [{ id: 'c1', name: 'C', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] },
      toManifest: empty,
      instanceControls: [{ id: 'ctl_1', controlTemplateId: 'c1', name: 'C', description: 'd' }],
      instanceTasks: [],
      instancePolicies: [],
      ...labels,
    });
    expect(preview.controls.archived).toHaveLength(1);
  });

  it('classifies updated + unedited control as applied', () => {
    const preview = buildUpdatePreview({
      fromManifest: { ...empty, controls: [{ id: 'c1', name: 'Old', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] },
      toManifest: { ...empty, controls: [{ id: 'c1', name: 'New', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] },
      instanceControls: [{ id: 'ctl_1', controlTemplateId: 'c1', name: 'Old', description: 'd' }],
      instanceTasks: [],
      instancePolicies: [],
      ...labels,
    });
    expect(preview.controls.updatedApplied).toHaveLength(1);
    expect(preview.controls.updatedPreserved).toHaveLength(0);
  });

  it('classifies updated + customer-edited control as preserved', () => {
    const preview = buildUpdatePreview({
      fromManifest: { ...empty, controls: [{ id: 'c1', name: 'Old', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] },
      toManifest: { ...empty, controls: [{ id: 'c1', name: 'New', description: 'd', requirementIds: [], policyIds: [], taskIds: [] }] },
      instanceControls: [{ id: 'ctl_1', controlTemplateId: 'c1', name: 'My edit', description: 'd' }],
      instanceTasks: [],
      instancePolicies: [],
      ...labels,
    });
    expect(preview.controls.updatedPreserved).toHaveLength(1);
    expect(preview.controls.updatedApplied).toHaveLength(0);
  });
});
