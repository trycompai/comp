import { describe, it, expect, vi } from 'vitest';
import { loadFrameworkSources } from './load-framework-sources';

// loadFrameworkSources operates purely on the injected `tx`; its only @db/server
// imports are `import type`, erased at runtime, so no module mock is required.

type LoaderTx = Parameters<typeof loadFrameworkSources>[0]['tx'];

interface TestManifest {
  framework: { id: string; name: string; catalogVersion: string; description: string | null };
  requirements: Array<{ id: string; identifier: string; name: string; description: string | null }>;
  controls: Array<{
    id: string;
    name: string;
    description: string;
    requirementIds: string[];
    policyIds: string[];
    taskIds: string[];
    documentTypes: string[];
  }>;
  policies: Array<{
    id: string;
    name: string;
    description: string | null;
    content: unknown;
    frequency: string | null;
    department: string | null;
  }>;
  tasks: Array<{
    id: string;
    name: string;
    description: string;
    frequency: string | null;
    department: string | null;
  }>;
}

/** A manifest with one control wiring up one requirement, one policy and one task. */
function fullManifest(): TestManifest {
  return {
    framework: { id: 'frk_pci', name: 'PCI DSS', catalogVersion: '1', description: null },
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
  };
}

function mockTx({
  versions,
  liveControlIds,
  livePolicyIds,
  liveTasks,
  liveRequirementIds,
}: {
  versions: Array<{ id: string; frameworkId: string; manifest: TestManifest }>;
  liveControlIds: string[];
  livePolicyIds: string[];
  liveTasks: Array<{ id: string; automationStatus: string }>;
  liveRequirementIds: string[];
}): LoaderTx {
  return {
    frameworkVersion: { findMany: vi.fn().mockResolvedValue(versions) },
    frameworkEditorControlTemplate: {
      findMany: vi.fn().mockResolvedValue(liveControlIds.map((id) => ({ id }))),
    },
    frameworkEditorPolicyTemplate: {
      findMany: vi.fn().mockResolvedValue(livePolicyIds.map((id) => ({ id }))),
    },
    frameworkEditorTaskTemplate: {
      findMany: vi.fn().mockResolvedValue(liveTasks),
    },
    frameworkEditorRequirement: {
      findMany: vi.fn().mockResolvedValue(liveRequirementIds.map((id) => ({ id }))),
    },
  } as unknown as LoaderTx;
}

const ids = <T extends { id: string }>(rows: T[]): string[] => rows.map((r) => r.id);

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
