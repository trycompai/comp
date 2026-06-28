import { Injectable, NotFoundException } from '@nestjs/common';
import { db, TaskFrequency } from '@db';
import { BrowserbaseScreenshotService } from './browserbase-screenshot.service';

const normalizeCriteria = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

@Injectable()
export class BrowserAutomationCrudService {
  constructor(
    private readonly screenshots: BrowserbaseScreenshotService = new BrowserbaseScreenshotService(),
  ) {}

  async createBrowserAutomation(
    data: {
      taskId: string;
      name: string;
      description?: string;
      targetUrl: string;
      instruction: string;
      evaluationCriteria?: string;
      scheduleFrequency?: TaskFrequency;
    },
    organizationId?: string,
  ) {
    if (organizationId) {
      await this.requireTaskInOrg({ taskId: data.taskId, organizationId });
    }

    return db.browserAutomation.create({
      data: {
        taskId: data.taskId,
        name: data.name,
        description: data.description,
        targetUrl: data.targetUrl,
        instruction: data.instruction,
        evaluationCriteria: normalizeCriteria(data.evaluationCriteria),
        isEnabled: true,
        ...(data.scheduleFrequency !== undefined
          ? { scheduleFrequency: data.scheduleFrequency }
          : {}),
      },
    });
  }

  async getBrowserAutomation(automationId: string, organizationId?: string) {
    const automation = await db.browserAutomation.findUnique({
      where: { id: automationId },
      include: {
        task: { select: { organizationId: true } },
        runs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    return this.hideCrossOrgAutomation({ automation, organizationId });
  }

  async getBrowserAutomationsForTask(taskId: string, organizationId?: string) {
    if (organizationId) {
      await this.requireTaskInOrg({ taskId, organizationId });
    }

    return db.browserAutomation.findMany({
      where: { taskId },
      include: {
        runs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateBrowserAutomation(
    automationId: string,
    data: {
      name?: string;
      description?: string;
      targetUrl?: string;
      instruction?: string;
      evaluationCriteria?: string;
      isEnabled?: boolean;
      scheduleFrequency?: TaskFrequency;
    },
    organizationId?: string,
  ) {
    if (organizationId) {
      await this.requireAutomationInOrg({ automationId, organizationId });
    }

    const { evaluationCriteria, scheduleFrequency, ...rest } = data;
    return db.browserAutomation.update({
      where: { id: automationId },
      data: {
        ...rest,
        ...(evaluationCriteria !== undefined
          ? { evaluationCriteria: normalizeCriteria(evaluationCriteria) }
          : {}),
        ...(scheduleFrequency !== undefined ? { scheduleFrequency } : {}),
      },
    });
  }

  async deleteBrowserAutomation(automationId: string, organizationId?: string) {
    if (organizationId) {
      await this.requireAutomationInOrg({ automationId, organizationId });
    }
    return db.browserAutomation.delete({ where: { id: automationId } });
  }

  async getRunWithPresignedUrl(runId: string, organizationId?: string) {
    const run = await db.browserAutomationRun.findUnique({
      where: { id: runId },
      include: { automation: { include: { task: true } } },
    });
    if (!run) return null;
    if (organizationId && run.automation.task.organizationId !== organizationId) {
      return null;
    }
    if (!run.screenshotUrl) return run;
    const screenshotUrl = await this.screenshots.getPresignedUrl({
      key: run.screenshotUrl,
    });
    return { ...run, screenshotUrl };
  }

  async getAutomationsWithPresignedUrls(taskId: string, organizationId?: string) {
    const automations = await this.getBrowserAutomationsForTask(taskId, organizationId);
    return Promise.all(
      automations.map(async (automation) => {
        const runsWithUrls = await Promise.all(
          automation.runs.map(async (run) => {
            if (!run.screenshotUrl) return run;
            const screenshotUrl = await this.screenshots.getPresignedUrl({
              key: run.screenshotUrl,
            });
            return { ...run, screenshotUrl };
          }),
        );
        return { ...automation, runs: runsWithUrls };
      }),
    );
  }

  async getAutomationRuns(
    automationId: string,
    limit = 20,
    organizationId?: string,
  ) {
    if (organizationId) {
      await this.requireAutomationInOrg({ automationId, organizationId });
    }
    return db.browserAutomationRun.findMany({
      where: { automationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getAutomationRun(runId: string, organizationId?: string) {
    return this.getRunWithPresignedUrl(runId, organizationId);
  }

  private hideCrossOrgAutomation<T extends { task: { organizationId: string } }>({
    automation,
    organizationId,
  }: {
    automation: T | null;
    organizationId?: string;
  }): T | null {
    if (!automation) return null;
    if (organizationId && automation.task.organizationId !== organizationId) {
      return null;
    }
    return automation;
  }

  private async requireAutomationInOrg(input: {
    automationId: string;
    organizationId: string;
  }) {
    const automation = await db.browserAutomation.findUnique({
      where: { id: input.automationId },
      include: { task: { select: { organizationId: true } } },
    });
    const scoped = this.hideCrossOrgAutomation({
      automation,
      organizationId: input.organizationId,
    });
    if (!scoped) throw new NotFoundException('Automation not found');
  }

  private async requireTaskInOrg(input: {
    taskId: string;
    organizationId: string;
  }) {
    const task = await db.task.findFirst({
      where: { id: input.taskId, organizationId: input.organizationId },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');
  }
}
