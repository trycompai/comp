// loadFrameworkSources operates purely on the injected `tx`; its only @db
// imports are `import type`, which are erased at runtime, so a no-op mock keeps
// jest from initialising a real PrismaClient.
jest.mock('@db', () => ({}));

import { loadFrameworkSources } from './frameworks-source-loader.helper';
import type { FrameworkManifest } from './framework-versioning/manifest.types';

type LoaderTx = Parameters<typeof loadFrameworkSources>[0]['tx'];

function manifest(overrides: Partial<FrameworkManifest> = {}): FrameworkManifest {
  return {
    framework: { id: 'frk_pci', name: 'PCI DSS', catalogVersion: '1', description: null },
    requirements: [],
    controls: [],
    policies: [],
    tasks: [],
    ...overrides,
  };
}

/**
 * A manifest with one control wiring up one requirement, one policy and one
 * task. Callers extend it to introduce ids that no longer exist live.
 */
function fullManifest(): FrameworkManifest {
  return manifest({
    requirements: [{ id: 'req_live', identifier: 'R1', name: 'Req', description: null }],
    controls: [
      {
        id: 'ct_live',
        name: 'Control',
        description: 'd',
        requirementIds: ['req_live'],
        policyIds: ['pt_live'],
        taskIds: ['tt_live'],
        documentTypes: [],
      },
    ],
    policies: [
      { id: 'pt_live', name: 'Policy', description: null, content: [], frequency: null, department: null },
    ],
    tasks: [{ id: 'tt_live', name: 'Task', description: 'd', frequency: null, department: null }],
  });
}

function mockTx({
  versions,
  liveControlIds,
  livePolicyIds,
  liveTasks,
  liveRequirementIds,
}: {
  versions: Array<{ id: string; frameworkId: string; manifest: FrameworkManifest }>;
  liveControlIds: string[];
  livePolicyIds: string[];
  liveTasks: Array<{ id: string; automationStatus: string }>;
  liveRequirementIds: string[];
}): LoaderTx {
  return {
    frameworkVersion: { findMany: jest.fn().mockResolvedValue(versions) },
    frameworkEditorControlTemplate: {
      findMany: jest.fn().mockResolvedValue(liveControlIds.map((id) => ({ id }))),
    },
    frameworkEditorPolicyTemplate: {
      findMany: jest.fn().mockResolvedValue(livePolicyIds.map((id) => ({ id }))),
    },
    frameworkEditorTaskTemplate: {
      findMany: jest.fn().mockResolvedValue(liveTasks),
    },
    frameworkEditorRequirement: {
      findMany: jest.fn().mockResolvedValue(liveRequirementIds.map((id) => ({ id }))),
    },
  } as unknown as LoaderTx;
}

function ids<T extends { id: string }>(rows: T[]): string[] {
  return rows.map((r) => r.id);
}

describe('loadFrameworkSources — stale-manifest reconciliation', () => {
  const frameworkEditorIds = ['frk_pci'];

  it('drops a manifest TASK whose live template was hard-deleted (the reported Task_taskTemplateId_fkey bug)', async () => {
    const m = fullManifest();
    m.controls[0].taskIds = ['tt_live', 'tt_dead'];
    m.tasks.push({ id: 'tt_dead', name: 'Deleted Task', description: 'd', frequency: null, department: null });

    const tx = mockTx({
      versions: [{ id: 'fv_1', frameworkId: 'frk_pci', manifest: m }],
      liveControlIds: ['ct_live'],
      livePolicyIds: ['pt_live'],
      liveTasks: [{ id: 'tt_live', automationStatus: 'AUTOMATED' }], // tt_dead absent
      liveRequirementIds: ['req_live'],
    });

    const result = await loadFrameworkSources({ frameworkEditorIds, frameworkEditorFrameworks: [], tx });

    // tt_dead must never reach task.createMany — it would FK-fail on insert.
    expect(ids(result.taskTemplates)).toEqual(['tt_live']);
  });

  it('drops a manifest CONTROL whose live template was hard-deleted', async () => {
    const m = fullManifest();
    m.controls.push({
      id: 'ct_dead',
      name: 'Deleted Control',
      description: 'd',
      requirementIds: [],
      policyIds: [],
      taskIds: [],
      documentTypes: [],
    });

    const tx = mockTx({
      versions: [{ id: 'fv_1', frameworkId: 'frk_pci', manifest: m }],
      liveControlIds: ['ct_live'], // ct_dead absent
      livePolicyIds: ['pt_live'],
      liveTasks: [{ id: 'tt_live', automationStatus: 'AUTOMATED' }],
      liveRequirementIds: ['req_live'],
    });

    const result = await loadFrameworkSources({ frameworkEditorIds, frameworkEditorFrameworks: [], tx });

    expect(ids(result.controlTemplates)).toEqual(['ct_live']);
  });

  it('drops a manifest POLICY whose live template was hard-deleted', async () => {
    const m = fullManifest();
    m.controls[0].policyIds = ['pt_live', 'pt_dead'];
    m.policies.push({
      id: 'pt_dead',
      name: 'Deleted Policy',
      description: null,
      content: [],
      frequency: null,
      department: null,
    });

    const tx = mockTx({
      versions: [{ id: 'fv_1', frameworkId: 'frk_pci', manifest: m }],
      liveControlIds: ['ct_live'],
      livePolicyIds: ['pt_live'], // pt_dead absent
      liveTasks: [{ id: 'tt_live', automationStatus: 'AUTOMATED' }],
      liveRequirementIds: ['req_live'],
    });

    const result = await loadFrameworkSources({ frameworkEditorIds, frameworkEditorFrameworks: [], tx });

    expect(ids(result.policyTemplates)).toEqual(['pt_live']);
  });

  it('drops a dead REQUIREMENT from groupedRelations (RequirementMap.requirementId has no downstream guard)', async () => {
    const m = fullManifest();
    m.controls[0].requirementIds = ['req_live', 'req_dead'];
    m.requirements.push({ id: 'req_dead', identifier: 'R2', name: 'Deleted Req', description: null });

    const tx = mockTx({
      versions: [{ id: 'fv_1', frameworkId: 'frk_pci', manifest: m }],
      liveControlIds: ['ct_live'],
      livePolicyIds: ['pt_live'],
      liveTasks: [{ id: 'tt_live', automationStatus: 'AUTOMATED' }],
      liveRequirementIds: ['req_live'], // req_dead absent
    });

    const result = await loadFrameworkSources({ frameworkEditorIds, frameworkEditorFrameworks: [], tx });

    const rel = result.groupedRelations.find((r) => r.controlTemplateId === 'ct_live');
    expect(rel?.requirementTemplateIds).toEqual(['req_live']);
  });

  it('passes everything through unchanged and resolves automationStatus when all templates are live', async () => {
    const tx = mockTx({
      versions: [{ id: 'fv_1', frameworkId: 'frk_pci', manifest: fullManifest() }],
      liveControlIds: ['ct_live'],
      livePolicyIds: ['pt_live'],
      liveTasks: [{ id: 'tt_live', automationStatus: 'MANUAL' }],
      liveRequirementIds: ['req_live'],
    });

    const result = await loadFrameworkSources({ frameworkEditorIds, frameworkEditorFrameworks: [], tx });

    expect(ids(result.controlTemplates)).toEqual(['ct_live']);
    expect(ids(result.policyTemplates)).toEqual(['pt_live']);
    expect(ids(result.taskTemplates)).toEqual(['tt_live']);
    // automationStatus is not in the manifest — it must come from the live row.
    expect(result.taskTemplates[0].automationStatus).toBe('MANUAL');
    const rel = result.groupedRelations.find((r) => r.controlTemplateId === 'ct_live');
    expect(rel?.requirementTemplateIds).toEqual(['req_live']);
    expect(rel?.policyTemplateIds).toEqual(['pt_live']);
    expect(rel?.taskTemplateIds).toEqual(['tt_live']);
  });
});
