import type { Prisma } from '@db';
import { upsertLatestSnapshotVersion } from './version-snapshot';

// A fake transaction client: only the ismsDocumentVersion methods the unit
// touches are stubbed. No module mock — the unit under test is imported real.
function makeTx() {
  const ismsDocumentVersion = {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  };
  const tx = { ismsDocumentVersion } as unknown as Prisma.TransactionClient;
  return { tx, ismsDocumentVersion };
}

const snapshot = { frameworkNames: ['ISO 27001'], vendorCount: 3 };

describe('upsertLatestSnapshotVersion', () => {
  it('updates the existing latest version with the serialized snapshot (UPDATE branch)', async () => {
    const { tx, ismsDocumentVersion } = makeTx();
    ismsDocumentVersion.findFirst.mockResolvedValue({ id: 'ver_existing' });

    await upsertLatestSnapshotVersion({
      tx,
      documentId: 'doc_1',
      snapshot,
    });

    expect(ismsDocumentVersion.findFirst).toHaveBeenCalledWith({
      where: { documentId: 'doc_1', isLatest: true },
    });
    expect(ismsDocumentVersion.update).toHaveBeenCalledWith({
      where: { id: 'ver_existing' },
      data: { sourceSnapshot: snapshot },
    });
    expect(ismsDocumentVersion.create).not.toHaveBeenCalled();
  });

  it('creates version 1 marked latest when none exists (CREATE branch)', async () => {
    const { tx, ismsDocumentVersion } = makeTx();
    ismsDocumentVersion.findFirst.mockResolvedValue(null);

    await upsertLatestSnapshotVersion({
      tx,
      documentId: 'doc_2',
      snapshot,
    });

    expect(ismsDocumentVersion.update).not.toHaveBeenCalled();
    expect(ismsDocumentVersion.create).toHaveBeenCalledWith({
      data: {
        documentId: 'doc_2',
        version: 1,
        isLatest: true,
        narrative: {},
        sourceSnapshot: snapshot,
      },
    });
  });

  it('serializes the snapshot through JSON, dropping undefined fields', async () => {
    const { tx, ismsDocumentVersion } = makeTx();
    ismsDocumentVersion.findFirst.mockResolvedValue(null);

    await upsertLatestSnapshotVersion({
      tx,
      documentId: 'doc_3',
      snapshot: { keep: 'yes', drop: undefined, nested: { ok: 1 } },
    });

    const createArg = ismsDocumentVersion.create.mock.calls[0][0];
    expect(createArg.data.sourceSnapshot).toEqual({
      keep: 'yes',
      nested: { ok: 1 },
    });
    expect('drop' in createArg.data.sourceSnapshot).toBe(false);
  });
});
