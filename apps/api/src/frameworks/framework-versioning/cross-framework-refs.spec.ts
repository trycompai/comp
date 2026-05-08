import { buildCrossFrameworkRefs } from './cross-framework-refs';

describe('buildCrossFrameworkRefs', () => {
  it('aggregates template IDs from other instances', () => {
    const refs = buildCrossFrameworkRefs({
      otherInstances: [
        {
          frameworkInstanceId: 'frm_iso',
          manifest: {
            framework: { id: 'frk_iso', name: 'ISO', catalogVersion: '1', description: null },
            requirements: [],
            controls: [{ id: 'ct_shared', name: '', description: '', requirementIds: [], policyIds: ['pt_shared'], taskIds: ['tt_shared'] }],
            policies: [{ id: 'pt_shared', name: '', description: null, content: [], frequency: null, department: null }],
            tasks: [{ id: 'tt_shared', name: '', description: '', frequency: null, department: null }],
          },
        },
      ],
    });

    expect(refs.controlTemplateIds.has('ct_shared')).toBe(true);
    expect(refs.policyTemplateIds.has('pt_shared')).toBe(true);
    expect(refs.taskTemplateIds.has('tt_shared')).toBe(true);
  });

  it('returns empty sets when no other instances', () => {
    const refs = buildCrossFrameworkRefs({ otherInstances: [] });
    expect(refs.controlTemplateIds.size).toBe(0);
  });
});
