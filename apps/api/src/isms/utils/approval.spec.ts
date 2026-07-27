import { invalidateApprovalIfNeeded } from './approval';

/**
 * invalidateApprovalIfNeeded is the central serialization point: every ISMS
 * content-mutation path calls it, and it must take the per-document advisory lock
 * (so edits serialize against approve()) BEFORE reading/altering status.
 */
function makeTx() {
  return {
    $executeRaw: jest.fn().mockResolvedValue(0),
    ismsDocument: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

describe('invalidateApprovalIfNeeded', () => {
  it('acquires the per-document advisory lock before reading status', async () => {
    const tx = makeTx();
    tx.ismsDocument.findUnique.mockResolvedValue({ status: 'draft' });

    await invalidateApprovalIfNeeded({
      tx: tx as never,
      documentId: 'doc_1',
    });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    // Lock is taken before the status read (serializes vs approve()).
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.ismsDocument.findUnique.mock.invocationCallOrder[0],
    );
  });

  it('reverts an approved document to draft (clearing approver + approvedAt)', async () => {
    const tx = makeTx();
    tx.ismsDocument.findUnique.mockResolvedValue({ status: 'approved' });

    await invalidateApprovalIfNeeded({
      tx: tx as never,
      documentId: 'doc_1',
    });

    expect(tx.ismsDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc_1' },
      data: { status: 'draft', approvedAt: null, approverId: null },
    });
  });

  it('is a no-op for a non-approved document (but still locked)', async () => {
    const tx = makeTx();
    tx.ismsDocument.findUnique.mockResolvedValue({ status: 'needs_review' });

    await invalidateApprovalIfNeeded({
      tx: tx as never,
      documentId: 'doc_1',
    });

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.ismsDocument.update).not.toHaveBeenCalled();
  });
});
