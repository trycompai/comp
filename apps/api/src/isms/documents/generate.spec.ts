import type { Prisma } from '@db';
import { runDerivation } from './generate';
import type { IsmsPlatformData } from './types';

/** Treat a hand-rolled mock as a transaction client without an `as any` cast. */
function asTx(mock: unknown): Prisma.TransactionClient {
  return mock as Prisma.TransactionClient;
}

const data: IsmsPlatformData = {
  organizationName: 'Acme',
  frameworkNames: ['ISO 27001'],
  vendorCount: 3,
  subProcessorCount: 1,
  vendorsByCategory: { cloud: 3 },
  subProcessorNames: ['Sub A'],
  infraVendorNames: ['Cloud A'],
  memberCount: 5,
  membersByDepartment: { it: 5 },
  deviceCount: 4,
  riskCount: 2,
  highRiskCount: 1,
  hasTrainingProgram: true,
  wizardAnswers: {},
  partiesFingerprint: '',
};

function registerTable() {
  return {
    deleteMany: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(2), // two manual rows preserved
    createMany: jest.fn().mockResolvedValue({}),
    findMany: jest.fn().mockResolvedValue([]),
  };
}

function buildTx() {
  return {
    ismsContextIssue: registerTable(),
    ismsInterestedParty: registerTable(),
    ismsInterestedPartyRequirement: registerTable(),
    ismsObjective: registerTable(),
    ismsDocument: {
      findFirst: jest.fn().mockResolvedValue(null),
      // CS-701: the draft narrative lives on IsmsDocument, not a version row.
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

const baseArgs = {
  documentId: 'doc_1',
  organizationId: 'org_1',
  frameworkId: 'fw_1',
  data,
};

describe('runDerivation', () => {
  it('writes context issues after preserved manual rows', async () => {
    const tx = buildTx();
    await runDerivation({
      tx: asTx(tx),
      type: 'context_of_organization',
      ...baseArgs,
    });
    expect(tx.ismsContextIssue.deleteMany).toHaveBeenCalledWith({
      where: { documentId: 'doc_1', source: 'derived' },
    });
    const created = tx.ismsContextIssue.createMany.mock.calls[0][0].data;
    expect(created[0].position).toBe(2);
  });

  it('writes interested parties', async () => {
    const tx = buildTx();
    await runDerivation({
      tx: asTx(tx),
      type: 'interested_parties_register',
      ...baseArgs,
    });
    expect(tx.ismsInterestedParty.createMany).toHaveBeenCalled();
    const created = tx.ismsInterestedParty.createMany.mock.calls[0][0].data;
    expect(created[0].position).toBe(2);
  });

  it('threads wizard answers into the interested-parties register (CS-438)', async () => {
    const tx = buildTx();
    await runDerivation({
      tx: asTx(tx),
      type: 'interested_parties_register',
      ...baseArgs,
      data: {
        ...data,
        wizardAnswers: { insurance: { has: true, insurerName: 'Acme Cyber' } },
      },
    });
    const created = tx.ismsInterestedParty.createMany.mock.calls[0][0].data;
    expect(
      created.some(
        (row: { derivedFrom: string }) =>
          row.derivedFrom === 'wizard:insurance',
      ),
    ).toBe(true);
  });

  it('reads the register doc to derive requirements', async () => {
    const tx = buildTx();
    tx.ismsDocument.findFirst.mockResolvedValue({ id: 'reg_1' });
    tx.ismsInterestedParty.findMany.mockResolvedValue([
      { id: 'ip_1', name: 'Customers', category: 'Customer' },
    ]);

    await runDerivation({
      tx: asTx(tx),
      type: 'interested_parties_requirements',
      ...baseArgs,
    });
    expect(tx.ismsDocument.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org_1',
        frameworkId: 'fw_1',
        type: 'interested_parties_register',
      },
      select: { id: true },
    });
    expect(tx.ismsInterestedPartyRequirement.createMany).toHaveBeenCalled();
  });

  it('writes objectives', async () => {
    const tx = buildTx();
    await runDerivation({ tx: asTx(tx), type: 'objectives_plan', ...baseArgs });
    expect(tx.ismsObjective.createMany).toHaveBeenCalled();
  });

  it('writes the derived narrative onto an empty document draft (isms_scope)', async () => {
    const tx = buildTx();
    await runDerivation({ tx: asTx(tx), type: 'isms_scope', ...baseArgs });
    expect(tx.ismsDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'doc_1' } }),
    );
    const updated = tx.ismsDocument.update.mock.calls[0][0].data;
    expect(updated.draftNarrative.certificateScopeSentence).toBeDefined();
  });

  it('preserves a non-empty existing draft narrative (CS-437 override)', async () => {
    const tx = buildTx();
    tx.ismsDocument.findUnique.mockResolvedValue({
      draftNarrative: { certificateScopeSentence: 'Manual edit' },
    });
    await runDerivation({
      tx: asTx(tx),
      type: 'leadership_commitment',
      ...baseArgs,
    });
    // A regenerate must never clobber the customer's manual narrative.
    expect(tx.ismsDocument.update).not.toHaveBeenCalled();
  });

  it('seeds the internal-audit programme onto an empty draft (CS-724)', async () => {
    const tx = buildTx();
    await runDerivation({ tx: asTx(tx), type: 'internal_audit', ...baseArgs });
    const updated = tx.ismsDocument.update.mock.calls[0][0].data;
    expect(updated.draftNarrative.programme).toContain(
      'Acme runs an annual internal audit',
    );
  });

  it('preserves an edited internal-audit programme on regenerate (CS-724)', async () => {
    const tx = buildTx();
    tx.ismsDocument.findUnique.mockResolvedValue({
      draftNarrative: { programme: 'Customer-edited programme.' },
    });
    await runDerivation({ tx: asTx(tx), type: 'internal_audit', ...baseArgs });
    expect(tx.ismsDocument.update).not.toHaveBeenCalled();
  });
});
