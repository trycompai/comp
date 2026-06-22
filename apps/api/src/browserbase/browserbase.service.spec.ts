// apps/api/src/browserbase/browserbase.service.spec.ts
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BrowserAutomationCrudService } from './browser-automation-crud.service';
import { BrowserAutomationExecutionService } from './browser-automation-execution.service';
import { BrowserAutomationRunStoreService } from './browser-automation-run-store.service';
import { BrowserAuthProfileContextService } from './browser-auth-profile-context.service';
import { BrowserAuthProfileService } from './browser-auth-profile.service';
import { BrowserEvidenceRunnerService } from './browser-evidence-runner.service';
import { BrowserbaseOrgContextService } from './browserbase-org-context.service';
import { BrowserbaseScreenshotService } from './browserbase-screenshot.service';
import { BrowserbaseSessionService } from './browserbase-session.service';
import { BrowserbaseService } from './browserbase.service';

jest.mock('@db', () => ({
  db: {
    browserAutomationRun: {
      findUnique: jest.fn(),
    },
    browserAutomation: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
  TaskFrequency: {
    daily: 'daily',
    weekly: 'weekly',
    monthly: 'monthly',
    quarterly: 'quarterly',
    yearly: 'yearly',
  },
}));

jest.mock('@/app/s3', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed'),
  s3Client: { send: jest.fn() },
  BUCKET_NAME: 'test-bucket',
}));

import { db, TaskFrequency } from '@db';
import { getSignedUrl } from '@/app/s3';

describe('BrowserbaseService.getScreenshotRedirectUrl', () => {
  let service: BrowserbaseService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BrowserbaseService,
        BrowserbaseSessionService,
        BrowserAutomationCrudService,
        BrowserAutomationExecutionService,
        BrowserAutomationRunStoreService,
        BrowserAuthProfileContextService,
        BrowserAuthProfileService,
        BrowserbaseOrgContextService,
        BrowserbaseScreenshotService,
        BrowserEvidenceRunnerService,
      ],
    }).compile();
    service = moduleRef.get(BrowserbaseService);
  });

  it('returns a freshly minted presigned URL for an in-scope run', async () => {
    (db.browserAutomationRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'bar_1',
      screenshotUrl: 'browser-automations/org_1/bau_1/bar_1.jpg',
      automation: { task: { organizationId: 'org_1' } },
    });

    const url = await service.getScreenshotRedirectUrl({
      runId: 'bar_1',
      organizationId: 'org_1',
    });

    expect(url).toBe('https://s3.example.com/signed');
    expect(db.browserAutomationRun.findUnique).toHaveBeenCalledWith({
      where: { id: 'bar_1' },
      include: { automation: { include: { task: true } } },
    });
  });

  it('throws NotFoundException when the run does not exist', async () => {
    (db.browserAutomationRun.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.getScreenshotRedirectUrl({
        runId: 'bar_missing',
        organizationId: 'org_1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the run belongs to a different org', async () => {
    (db.browserAutomationRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'bar_1',
      screenshotUrl: 'browser-automations/org_2/bau_1/bar_1.jpg',
      automation: { task: { organizationId: 'org_2' } },
    });

    await expect(
      service.getScreenshotRedirectUrl({
        runId: 'bar_1',
        organizationId: 'org_1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when the run has no screenshot', async () => {
    (db.browserAutomationRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'bar_1',
      screenshotUrl: null,
      automation: { task: { organizationId: 'org_1' } },
    });

    await expect(
      service.getScreenshotRedirectUrl({
        runId: 'bar_1',
        organizationId: 'org_1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('signs the URL without Content-Disposition when download is falsy', async () => {
    (db.browserAutomationRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'bar_1',
      screenshotUrl: 'browser-automations/org_1/bau_1/bar_1.jpg',
      automation: { task: { organizationId: 'org_1' } },
    });

    await service.getScreenshotRedirectUrl({
      runId: 'bar_1',
      organizationId: 'org_1',
    });

    const command = (getSignedUrl as jest.Mock).mock.calls[0][1];
    expect(command.input.ResponseContentDisposition).toBeUndefined();
  });

  it('signs the URL with attachment Content-Disposition when download is true', async () => {
    (db.browserAutomationRun.findUnique as jest.Mock).mockResolvedValue({
      id: 'bar_1',
      screenshotUrl: 'browser-automations/org_1/bau_1/bar_1.jpg',
      automation: { task: { organizationId: 'org_1' } },
    });

    await service.getScreenshotRedirectUrl({
      runId: 'bar_1',
      organizationId: 'org_1',
      download: true,
    });

    const command = (getSignedUrl as jest.Mock).mock.calls[0][1];
    expect(command.input.ResponseContentDisposition).toBe(
      'attachment; filename="screenshot-bar_1.jpg"',
    );
  });
});

describe('BrowserbaseService schedule frequency passthrough', () => {
  let service: BrowserbaseService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        BrowserbaseService,
        BrowserbaseSessionService,
        BrowserAutomationCrudService,
        BrowserAutomationExecutionService,
        BrowserAutomationRunStoreService,
        BrowserAuthProfileContextService,
        BrowserAuthProfileService,
        BrowserbaseOrgContextService,
        BrowserbaseScreenshotService,
        BrowserEvidenceRunnerService,
      ],
    }).compile();
    service = moduleRef.get(BrowserbaseService);
  });

  it('forwards scheduleFrequency when creating a browser automation', async () => {
    (db.browserAutomation.create as jest.Mock).mockResolvedValue({
      id: 'bau_1',
    });

    await service.createBrowserAutomation({
      taskId: 'tsk_1',
      name: 'name',
      targetUrl: 'https://example.com',
      instruction: 'click',
      scheduleFrequency: TaskFrequency.weekly,
    });

    expect(db.browserAutomation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ scheduleFrequency: 'weekly' }),
      }),
    );
  });

  it('omits scheduleFrequency when creating without the field', async () => {
    (db.browserAutomation.create as jest.Mock).mockResolvedValue({
      id: 'bau_1',
    });

    await service.createBrowserAutomation({
      taskId: 'tsk_1',
      name: 'name',
      targetUrl: 'https://example.com',
      instruction: 'click',
    });

    const call = (db.browserAutomation.create as jest.Mock).mock.calls[0][0];
    expect(call.data).not.toHaveProperty('scheduleFrequency');
  });

  it('forwards scheduleFrequency when updating a browser automation', async () => {
    (db.browserAutomation.update as jest.Mock).mockResolvedValue({
      id: 'bau_1',
    });

    await service.updateBrowserAutomation('bau_1', {
      scheduleFrequency: TaskFrequency.monthly,
    });

    expect(db.browserAutomation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bau_1' },
        data: expect.objectContaining({ scheduleFrequency: 'monthly' }),
      }),
    );
  });

  it('omits scheduleFrequency when updating without the field', async () => {
    (db.browserAutomation.update as jest.Mock).mockResolvedValue({
      id: 'bau_1',
    });

    await service.updateBrowserAutomation('bau_1', { name: 'renamed' });

    const call = (db.browserAutomation.update as jest.Mock).mock.calls[0][0];
    expect(call.data).not.toHaveProperty('scheduleFrequency');
  });
});
