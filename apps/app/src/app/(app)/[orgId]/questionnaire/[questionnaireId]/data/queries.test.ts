import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@db', async () => {
  const { mockDb } = await import('@/test-utils/mocks/db');
  return { db: mockDb };
});

import { mockDb } from '@/test-utils/mocks/db';

const { getQuestionnaireById } = await import('./queries');

describe('getQuestionnaireById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query using the provided organizationId directly without session checks', async () => {
    const questionnaireId = 'q_123';
    const organizationId = 'org_abc';
    const mockQuestionnaire = {
      id: questionnaireId,
      organizationId,
      questions: [],
    };

    mockDb.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire);

    const result = await getQuestionnaireById(questionnaireId, organizationId);

    expect(result).toEqual(mockQuestionnaire);
    expect(mockDb.questionnaire.findUnique).toHaveBeenCalledWith({
      where: { id: questionnaireId, organizationId },
      include: {
        questions: {
          orderBy: { questionIndex: 'asc' },
          select: {
            id: true,
            question: true,
            answer: true,
            status: true,
            questionIndex: true,
            sources: true,
          },
        },
      },
    });
  });

  it('should return null when questionnaire is not found', async () => {
    mockDb.questionnaire.findUnique.mockResolvedValue(null);

    const result = await getQuestionnaireById('q_missing', 'org_abc');

    expect(result).toBeNull();
  });

  it('should return questionnaire with questions ordered by index', async () => {
    const mockQuestionnaire = {
      id: 'q_123',
      organizationId: 'org_abc',
      questions: [
        { id: 'q1', question: 'First?', answer: 'A1', status: 'answered', questionIndex: 0, sources: [] },
        { id: 'q2', question: 'Second?', answer: 'A2', status: 'answered', questionIndex: 1, sources: [] },
      ],
    };

    mockDb.questionnaire.findUnique.mockResolvedValue(mockQuestionnaire);

    const result = await getQuestionnaireById('q_123', 'org_abc');

    expect(result?.questions).toHaveLength(2);
    expect(result?.questions[0].questionIndex).toBe(0);
  });
});
