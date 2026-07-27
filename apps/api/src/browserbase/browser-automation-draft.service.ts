import { Injectable, NotFoundException } from '@nestjs/common';
import { db, Prisma } from '@db';

/** Strip class instances / undefined down to plain JSON for a Prisma Json column. */
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null));
}

interface DraftInput {
  name?: string | null;
  steps: unknown;
}

/**
 * Server-side store for in-progress (unsaved) automations. Drafts are scoped to
 * a task (and therefore an org); they hold the composer's raw step state as JSON
 * and are deleted once the automation is saved for real.
 */
@Injectable()
export class BrowserAutomationDraftService {
  private async requireTaskInOrg(taskId: string, organizationId: string) {
    const task = await db.task.findFirst({
      where: { id: taskId, organizationId },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found');
  }

  private async requireDraftInOrg(draftId: string, organizationId: string) {
    const draft = await db.browserAutomationDraft.findFirst({
      where: { id: draftId, task: { organizationId } },
      select: { id: true },
    });
    if (!draft) throw new NotFoundException('Draft not found');
  }

  async listDraftsForTask(taskId: string, organizationId: string) {
    await this.requireTaskInOrg(taskId, organizationId);
    return db.browserAutomationDraft.findMany({
      where: { taskId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createDraft(
    input: DraftInput & { taskId: string; createdById?: string | null },
    organizationId: string,
  ) {
    await this.requireTaskInOrg(input.taskId, organizationId);
    return db.browserAutomationDraft.create({
      data: {
        taskId: input.taskId,
        createdById: input.createdById ?? null,
        name: input.name ?? null,
        steps: toJson(input.steps),
      },
    });
  }

  async updateDraft(
    draftId: string,
    input: { name?: string | null; steps?: unknown },
    organizationId: string,
  ) {
    await this.requireDraftInOrg(draftId, organizationId);
    return db.browserAutomationDraft.update({
      where: { id: draftId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.steps !== undefined ? { steps: toJson(input.steps) } : {}),
      },
    });
  }

  async deleteDraft(draftId: string, organizationId: string) {
    await this.requireDraftInOrg(draftId, organizationId);
    await db.browserAutomationDraft.delete({ where: { id: draftId } });
    return { success: true };
  }
}
