const mockSync = jest.fn();
const mockGenerateAnswer = jest.fn();

interface RetiredTask {
  id: string;
  run: (payload: unknown) => Promise<never>;
}

jest.mock('@trigger.dev/sdk', () => ({
  task: jest.fn((definition: RetiredTask) => definition),
}));
jest.mock('@/vector-store/lib', () => ({
  syncOrganizationEmbeddings: mockSync,
}));
jest.mock('./answer-question-helpers', () => ({
  generateAnswerWithRAG: mockGenerateAnswer,
}));

import './parse-questionnaire';
import './retired-questionnaire-tasks';

const sdkMock: { task: jest.Mock<RetiredTask, [RetiredTask]> } =
  jest.requireMock('@trigger.dev/sdk');

describe('retired public questionnaire tasks', () => {
  it.each([
    'parse-questionnaire',
    'answer-question',
    'vendor-questionnaire-orchestrator',
  ])(
    'rejects deployed ID %s before accessing organization data',
    async (id) => {
      const fetchSpy = jest.spyOn(globalThis, 'fetch');
      const retiredTask = sdkMock.task.mock.calls.find(
        ([definition]) => definition.id === id,
      )?.[0];
      if (!retiredTask)
        throw new Error(`Retired task ID ${id} is not registered`);

      await expect(
        retiredTask.run({
          organizationId: 'org_bbbbbbbbbbbbbbbbbbbbbbbb',
          question: 'Private policy?',
          inputType: 'attachment',
          attachmentId: 'victim-attachment',
        }),
      ).rejects.toThrow('Public questionnaire tasks are retired');
      expect(mockSync).not.toHaveBeenCalled();
      expect(mockGenerateAnswer).not.toHaveBeenCalled();
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    },
  );
});
