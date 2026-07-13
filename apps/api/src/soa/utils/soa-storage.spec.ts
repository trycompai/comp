import { db } from '@db';
import { countAnsweredAnswers } from './soa-storage';

jest.mock('@db', () => ({
  db: {
    sOAAnswer: {
      count: jest.fn(),
    },
  },
}));

const mockDb = jest.mocked(db);

describe('countAnsweredAnswers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts only latest answered rows whose questionId is in the active configuration', async () => {
    (mockDb.sOAAnswer.count as jest.Mock).mockResolvedValue(2);

    const result = await countAnsweredAnswers('doc-1', ['q-1', 'q-2']);

    expect(result).toBe(2);
    // Scoping by questionId excludes stale/mismatched answers (e.g. for a
    // control that was later removed from the configuration) so they can't
    // inflate the completion count.
    expect(mockDb.sOAAnswer.count).toHaveBeenCalledWith({
      where: {
        documentId: 'doc-1',
        isLatestAnswer: true,
        isApplicable: { not: null },
        questionId: { in: ['q-1', 'q-2'] },
      },
    });
  });

  it('returns 0 without querying when the configuration has no questions', async () => {
    const result = await countAnsweredAnswers('doc-1', []);

    expect(result).toBe(0);
    expect(mockDb.sOAAnswer.count).not.toHaveBeenCalled();
  });
});
