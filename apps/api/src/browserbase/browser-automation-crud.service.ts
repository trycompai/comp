import { Injectable, NotFoundException } from '@nestjs/common';
import { db, TaskFrequency } from '@db';
import { BrowserbaseScreenshotService } from './browserbase-screenshot.service';

const normalizeCriteria = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

/** One step of a (possibly multi-vendor) automation. */
export interface BrowserAutomationStepInput {
  profileId?: string | null;
  targetUrl: string;
  instruction: string;
  evaluationCriteria?: string | null;
}

/**
 * Every automation is stored as an ordered list of steps. When only the legacy
 * single instruction is supplied, treat it as a one-step automation.
 */
function resolveSteps(data: {
  targetUrl?: string;
  instruction?: string;
  evaluationCriteria?: string | null;
  steps?: BrowserAutomationStepInput[];
}): BrowserAutomationStepInput[] {
  if (data.steps && data.steps.length > 0) return data.steps;
  return [
    {
      targetUrl: data.targetUrl ?? '',
      instruction: data.instruction ?? '',
      evaluationCriteria: data.evaluationCriteria,
    },
  ];
}

const toStepCreate = (steps: BrowserAutomationStepInput[]) =>
  steps.map((step, index) => ({
    order: index,
    profileId: step.profileId ?? null,
    targetUrl: step.targetUrl,
    instruction: step.instruction,
    evaluationCriteria: normalizeCriteria(step.evaluationCriteria),
  }));

const STEP_INCLUDE = { steps: { orderBy: { order: 'asc' as const } } };

/** Per-step evidence for a run — one screenshot + verdict per step, in order. */
const RUN_STEP_RUNS_INCLUDE = {
  stepRuns: {
    orderBy: { order: 'asc' as const },
    include: { step: { select: { targetUrl: true } } },
  },
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
      steps?: BrowserAutomationStepInput[];
      scheduleFrequency?: TaskFrequency;
    },
    organizationId?: string,
  ) {
    if (organizationId) {
      await this.requireTaskInOrg({ taskId: data.taskId, organizationId });
    }

    const steps = resolveSteps(data);
    const first = steps[0];

    // A task's browser evidence shares one cadence (set from the section
    // header), so a new automation inherits the task's current schedule rather
    // than silently defaulting to daily.
    const scheduleFrequency =
      data.scheduleFrequency ??
      (
        await db.browserAutomation.findFirst({
          where: { taskId: data.taskId },
          orderBy: { createdAt: 'asc' },
          select: { scheduleFrequency: true },
        })
      )?.scheduleFrequency;

    return db.browserAutomation.create({
      data: {
        taskId: data.taskId,
        name: data.name,
        description: data.description,
        // Keep the legacy single fields in sync with the first step until the
        // engine reads steps directly (then these columns get dropped).
        targetUrl: first.targetUrl,
        instruction: first.instruction,
        evaluationCriteria: normalizeCriteria(first.evaluationCriteria),
        isEnabled: true,
        ...(scheduleFrequency !== undefined ? { scheduleFrequency } : {}),
        steps: { create: toStepCreate(steps) },
      },
      include: STEP_INCLUDE,
    });
  }

  async getBrowserAutomation(automationId: string, organizationId?: string) {
    const automation = await db.browserAutomation.findUnique({
      where: { id: automationId },
      include: {
        task: { select: { organizationId: true } },
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: RUN_STEP_RUNS_INCLUDE,
        },
        ...STEP_INCLUDE,
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
        runs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: RUN_STEP_RUNS_INCLUDE,
        },
        ...STEP_INCLUDE,
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
      steps?: BrowserAutomationStepInput[];
      scheduleFrequency?: TaskFrequency;
    },
    organizationId?: string,
  ) {
    if (organizationId) {
      await this.requireAutomationInOrg({ automationId, organizationId });
    }

    const { evaluationCriteria, scheduleFrequency, steps, ...rest } = data;

    // Steps supplied → replace the whole sequence and sync the legacy columns
    // from the first step (atomic so a run never sees a half-updated list).
    if (steps && steps.length > 0) {
      const first = steps[0];
      return db.$transaction(async (tx) => {
        await tx.browserAutomationStep.deleteMany({ where: { automationId } });
        return tx.browserAutomation.update({
          where: { id: automationId },
          data: {
            ...rest,
            targetUrl: first.targetUrl,
            instruction: first.instruction,
            evaluationCriteria: normalizeCriteria(first.evaluationCriteria),
            ...(scheduleFrequency !== undefined ? { scheduleFrequency } : {}),
            steps: { create: toStepCreate(steps) },
          },
          include: STEP_INCLUDE,
        });
      });
    }

    // Legacy single-field edit → update the automation and mirror it onto the
    // first step so the two representations stay consistent.
    const stepPatch = {
      ...(rest.targetUrl !== undefined ? { targetUrl: rest.targetUrl } : {}),
      ...(rest.instruction !== undefined ? { instruction: rest.instruction } : {}),
      ...(evaluationCriteria !== undefined
        ? { evaluationCriteria: normalizeCriteria(evaluationCriteria) }
        : {}),
    };

    return db.$transaction(async (tx) => {
      const updated = await tx.browserAutomation.update({
        where: { id: automationId },
        data: {
          ...rest,
          ...(evaluationCriteria !== undefined
            ? { evaluationCriteria: normalizeCriteria(evaluationCriteria) }
            : {}),
          ...(scheduleFrequency !== undefined ? { scheduleFrequency } : {}),
        },
        include: STEP_INCLUDE,
      });
      if (Object.keys(stepPatch).length > 0) {
        await tx.browserAutomationStep.updateMany({
          where: { automationId, order: 0 },
          data: stepPatch,
        });
      }
      return updated;
    });
  }

  async deleteBrowserAutomation(automationId: string, organizationId?: string) {
    if (organizationId) {
      await this.requireAutomationInOrg({ automationId, organizationId });
    }
    return db.browserAutomation.delete({ where: { id: automationId } });
  }

  /**
   * Set one cadence for every browser automation on a task. Browser evidence
   * shares a task-level schedule (there's no need to run different vendors in
   * one task on different days), so this bulk-updates them together.
   */
  async setTaskSchedule(
    taskId: string,
    scheduleFrequency: TaskFrequency,
    organizationId?: string,
  ) {
    if (organizationId) {
      await this.requireTaskInOrg({ taskId, organizationId });
    }
    const { count } = await db.browserAutomation.updateMany({
      where: { taskId },
      data: { scheduleFrequency },
    });
    return { success: true, scheduleFrequency, updated: count };
  }

  /** Presign a run's own screenshot and each of its per-step screenshots. */
  private async presignRun<
    T extends {
      screenshotUrl: string | null;
      stepRuns?: Array<{ screenshotUrl: string | null }>;
    },
  >(run: T): Promise<T> {
    const presign = (key: string | null): Promise<string | null> =>
      key ? this.screenshots.getPresignedUrl({ key }) : Promise.resolve(key);
    const [screenshotUrl, stepRuns] = await Promise.all([
      presign(run.screenshotUrl),
      run.stepRuns
        ? Promise.all(
            run.stepRuns.map(async (stepRun) => ({
              ...stepRun,
              screenshotUrl: await presign(stepRun.screenshotUrl),
            })),
          )
        : Promise.resolve(run.stepRuns),
    ]);
    return { ...run, screenshotUrl, stepRuns } as T;
  }

  async getRunWithPresignedUrl(runId: string, organizationId?: string) {
    const run = await db.browserAutomationRun.findUnique({
      where: { id: runId },
      include: {
        automation: { include: { task: true } },
        ...RUN_STEP_RUNS_INCLUDE,
      },
    });
    if (!run) return null;
    if (organizationId && run.automation.task.organizationId !== organizationId) {
      return null;
    }
    return this.presignRun(run);
  }

  async getAutomationsWithPresignedUrls(taskId: string, organizationId?: string) {
    const automations = await this.getBrowserAutomationsForTask(taskId, organizationId);
    return Promise.all(
      automations.map(async (automation) => ({
        ...automation,
        runs: await Promise.all(automation.runs.map((run) => this.presignRun(run))),
      })),
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
