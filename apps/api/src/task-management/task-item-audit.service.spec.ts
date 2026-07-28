const mockCreate = jest.fn();
jest.mock('@db', () => ({
  db: { auditLog: { create: (...args: unknown[]) => mockCreate(...args) } },
}));

import { TaskItemAuditService } from './task-item-audit.service';

describe('TaskItemAuditService', () => {
  let service: TaskItemAuditService;

  const base = {
    taskItemId: 'ti_1',
    organizationId: 'org_1',
    userId: 'usr_1',
    memberId: 'mem_1',
    taskTitle: 'Review Vendor X',
    entityType: 'vendor',
    entityId: 'vnd_1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({});
    service = new TaskItemAuditService();
  });

  describe('logTaskItemCreated', () => {
    it('names the task in the description (readable in the global feed)', async () => {
      await service.logTaskItemCreated(base);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entityType: 'task',
            entityId: 'ti_1',
            description: 'Created task "Review Vendor X"',
          }),
        }),
      );
    });

    it('marks API-key creation', async () => {
      await service.logTaskItemCreated({ ...base, viaApiKey: true });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Created task "Review Vendor X" (via API key)',
          }),
        }),
      );
    });
  });

  describe('logTaskItemDeleted', () => {
    it('names the task in the description', async () => {
      await service.logTaskItemDeleted(base);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Deleted task "Review Vendor X"',
          }),
        }),
      );
    });
  });
});
