jest.mock('@db', () => ({
  db: {
    task: { findFirst: jest.fn() },
    browserAutomationDraft: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
  Prisma: {},
}));

import { db } from '@db';
import { BrowserAutomationDraftService } from './browser-automation-draft.service';

describe('BrowserAutomationDraftService', () => {
  let service: BrowserAutomationDraftService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BrowserAutomationDraftService();
  });

  it('creates a draft after checking the task is in the org, storing plain JSON steps', async () => {
    (db.task.findFirst as jest.Mock).mockResolvedValue({ id: 'tsk_1' });
    (db.browserAutomationDraft.create as jest.Mock).mockResolvedValue({ id: 'bad_1' });

    await service.createDraft(
      {
        taskId: 'tsk_1',
        name: 'GitHub 2FA',
        steps: [{ profileId: 'p1', instruction: 'x', extra: undefined }],
      },
      'org_1',
    );

    expect(db.task.findFirst).toHaveBeenCalledWith({
      where: { id: 'tsk_1', organizationId: 'org_1' },
      select: { id: true },
    });
    const data = (db.browserAutomationDraft.create as jest.Mock).mock.calls[0][0].data;
    expect(data.taskId).toBe('tsk_1');
    expect(data.name).toBe('GitHub 2FA');
    // toJson strips undefined -> plain JSON.
    expect(data.steps).toEqual([{ profileId: 'p1', instruction: 'x' }]);
  });

  it('rejects creating a draft for a task in another org', async () => {
    (db.task.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createDraft({ taskId: 'tsk_x', steps: [] }, 'org_1'),
    ).rejects.toThrow('Task not found');
    expect(db.browserAutomationDraft.create).not.toHaveBeenCalled();
  });

  it('updates a draft only when it belongs to the org', async () => {
    (db.browserAutomationDraft.findFirst as jest.Mock).mockResolvedValue({ id: 'bad_1' });
    (db.browserAutomationDraft.update as jest.Mock).mockResolvedValue({ id: 'bad_1' });

    await service.updateDraft('bad_1', { steps: [{ instruction: 'y' }] }, 'org_1');

    expect(db.browserAutomationDraft.findFirst).toHaveBeenCalledWith({
      where: { id: 'bad_1', task: { organizationId: 'org_1' } },
      select: { id: true },
    });
    expect(db.browserAutomationDraft.update).toHaveBeenCalledWith({
      where: { id: 'bad_1' },
      data: { steps: [{ instruction: 'y' }] },
    });
  });

  it('rejects deleting a draft from another org', async () => {
    (db.browserAutomationDraft.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.deleteDraft('bad_x', 'org_1')).rejects.toThrow('Draft not found');
    expect(db.browserAutomationDraft.delete).not.toHaveBeenCalled();
  });
});
