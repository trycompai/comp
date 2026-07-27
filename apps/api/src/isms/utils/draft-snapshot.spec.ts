import type { Prisma } from '@db';
import { updateDraftSnapshot } from './draft-snapshot';

// A fake transaction client: only the ismsDocument.update the unit touches is
// stubbed. No module mock — the unit under test is imported real.
function makeTx() {
  const ismsDocument = { update: jest.fn() };
  const tx = { ismsDocument } as unknown as Prisma.TransactionClient;
  return { tx, ismsDocument };
}

const snapshot = { frameworkNames: ['ISO 27001'], vendorCount: 3 };

describe('updateDraftSnapshot', () => {
  it('writes the serialized snapshot onto the document draftSnapshot', async () => {
    const { tx, ismsDocument } = makeTx();

    await updateDraftSnapshot({ tx, documentId: 'doc_1', snapshot });

    expect(ismsDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc_1' },
      data: { draftSnapshot: snapshot },
    });
  });

  it('serializes the snapshot through JSON, dropping undefined fields', async () => {
    const { tx, ismsDocument } = makeTx();

    await updateDraftSnapshot({
      tx,
      documentId: 'doc_2',
      snapshot: { keep: 'yes', drop: undefined, nested: { ok: 1 } },
    });

    const updateArg = ismsDocument.update.mock.calls[0][0];
    expect(updateArg.data.draftSnapshot).toEqual({
      keep: 'yes',
      nested: { ok: 1 },
    });
    expect('drop' in updateArg.data.draftSnapshot).toBe(false);
  });

  it('scopes the write to the given document id', async () => {
    const { tx, ismsDocument } = makeTx();

    await updateDraftSnapshot({ tx, documentId: 'doc_3', snapshot });

    expect(ismsDocument.update.mock.calls[0][0].where).toEqual({ id: 'doc_3' });
  });
});
