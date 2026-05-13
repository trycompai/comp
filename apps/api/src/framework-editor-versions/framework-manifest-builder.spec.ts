import { buildManifestForFramework } from './framework-manifest-builder';

jest.mock('@db', () => ({
  db: {
    frameworkEditorFramework: { findUnique: jest.fn() },
  },
}));
import { db } from '@db';

describe('buildManifestForFramework', () => {
  beforeEach(() => jest.clearAllMocks());

  it('produces a manifest with framework, requirements, controls, policies, tasks', async () => {
    // Shape of the mocked result reflects the REAL schema: requirements -> controlTemplates -> policyTemplates/taskTemplates.
    (db.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
      id: 'frk_soc2',
      name: 'SOC 2',
      version: 'TSC 2017 (rev 2022)',
      description: null,
      requirements: [
        {
          id: 'frk_rq_cc61',
          identifier: 'CC6.1',
          name: 'Logical Access',
          description: 'x',
          controlTemplates: [
            {
              id: 'frk_ct_logical_access',
              name: 'Logical Access Controls',
              description: 'desc',
              requirements: [{ id: 'frk_rq_cc61' }],
              frameworkPolicyLinks: [
                { policyTemplate: { id: 'frk_pt_acc', name: 'Access Policy', description: null, content: [{}], frequency: 'yearly', department: 'it' } },
              ],
              frameworkTaskLinks: [
                { taskTemplate: { id: 'frk_tt_rev', name: 'Review Access', description: 'Review quarterly', frequency: 'quarterly', department: 'it' } },
              ],
              frameworkDocumentLinks: [{ formType: 'rbac_matrix' }],
            },
          ],
        },
      ],
    });

    const manifest = await buildManifestForFramework('frk_soc2');

    expect(manifest.framework.id).toBe('frk_soc2');
    expect(manifest.framework.catalogVersion).toBe('TSC 2017 (rev 2022)');
    expect(manifest.requirements).toHaveLength(1);
    expect(manifest.requirements[0].identifier).toBe('CC6.1');
    expect(manifest.controls).toHaveLength(1);
    expect(manifest.controls[0].id).toBe('frk_ct_logical_access');
    expect(manifest.controls[0].requirementIds).toEqual(['frk_rq_cc61']);
    expect(manifest.controls[0].policyIds).toEqual(['frk_pt_acc']);
    expect(manifest.controls[0].taskIds).toEqual(['frk_tt_rev']);
    expect(manifest.policies).toHaveLength(1);
    expect(manifest.tasks).toHaveLength(1);
  });

  it('dedupes controls/policies/tasks that appear under multiple requirements', async () => {
    (db.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
      id: 'frk_iso',
      name: 'ISO 27001',
      version: '2022',
      description: null,
      requirements: [
        {
          id: 'rq_a', identifier: 'A', name: 'A', description: null,
          controlTemplates: [
            {
              id: 'ct_shared', name: 'Shared', description: 'd',
              requirements: [{ id: 'rq_a' }, { id: 'rq_b' }],
              frameworkPolicyLinks: [{ policyTemplate: { id: 'pt_shared', name: 'P', description: null, content: [], frequency: null, department: null } }],
              frameworkTaskLinks: [{ taskTemplate: { id: 'tt_shared', name: 'T', description: '', frequency: null, department: null } }],
              frameworkDocumentLinks: [],
            },
          ],
        },
        {
          id: 'rq_b', identifier: 'B', name: 'B', description: null,
          controlTemplates: [
            {
              id: 'ct_shared', name: 'Shared', description: 'd',
              requirements: [{ id: 'rq_a' }, { id: 'rq_b' }],
              frameworkPolicyLinks: [{ policyTemplate: { id: 'pt_shared', name: 'P', description: null, content: [], frequency: null, department: null } }],
              frameworkTaskLinks: [{ taskTemplate: { id: 'tt_shared', name: 'T', description: '', frequency: null, department: null } }],
              frameworkDocumentLinks: [],
            },
          ],
        },
      ],
    });

    const manifest = await buildManifestForFramework('frk_iso');

    expect(manifest.controls).toHaveLength(1);
    expect(manifest.controls[0].requirementIds.sort()).toEqual(['rq_a', 'rq_b']);
    expect(manifest.policies).toHaveLength(1);
    expect(manifest.tasks).toHaveLength(1);
  });

  it('throws when framework not found', async () => {
    (db.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(buildManifestForFramework('missing')).rejects.toThrow('Framework not found');
  });

  it('only includes policy task and document links scoped to the requested framework', async () => {
    (db.frameworkEditorFramework.findUnique as jest.Mock).mockResolvedValue({
      id: 'frk_hipaa',
      name: 'HIPAA',
      version: '2026',
      description: null,
      requirements: [
        {
          id: 'rq_hipaa',
          identifier: 'H1',
          name: 'HIPAA requirement',
          description: null,
          controlTemplates: [
            {
              id: 'ct_shared',
              name: 'Shared',
              description: 'd',
              requirements: [{ id: 'rq_hipaa' }, { id: 'rq_pci' }],
              frameworkPolicyLinks: [
                { policyTemplate: { id: 'pt_hipaa', name: 'HIPAA Policy', description: null, content: [], frequency: null, department: null } },
              ],
              frameworkTaskLinks: [
                { taskTemplate: { id: 'tt_hipaa', name: 'HIPAA Task', description: '', frequency: null, department: null } },
              ],
              frameworkDocumentLinks: [{ formType: 'access_request' }],
            },
          ],
        },
      ],
    });

    const manifest = await buildManifestForFramework('frk_hipaa');

    expect(manifest.controls[0].policyIds).toEqual(['pt_hipaa']);
    expect(manifest.controls[0].taskIds).toEqual(['tt_hipaa']);
    expect(manifest.controls[0].documentTypes).toEqual(['access_request']);
    expect(manifest.controls[0].requirementIds).toEqual(['rq_hipaa']);
  });
});
