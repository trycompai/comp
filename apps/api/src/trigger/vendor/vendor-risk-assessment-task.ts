import { db, TaskItemPriority, TaskItemStatus, type TaskItemEntityType } from '@db';
import { logger, queue, schemaTask } from '@trigger.dev/sdk';

import { resolveTaskCreatorAndAssignee } from './vendor-risk-assessment/assignee';
import {
  VENDOR_RISK_ASSESSMENT_TASK_ID,
  VENDOR_RISK_ASSESSMENT_TASK_TITLE,
} from './vendor-risk-assessment/constants';
import { buildRiskAssessmentDescription } from './vendor-risk-assessment/description';
import { firecrawlAgentVendorRiskAssessment } from './vendor-risk-assessment/firecrawl-agent';
import {
  buildFrameworkChecklist,
  getDefaultFrameworks,
} from './vendor-risk-assessment/frameworks';
import { vendorRiskAssessmentPayloadSchema } from './vendor-risk-assessment/schema';

async function logAutomatedTaskCreation(params: {
  organizationId: string;
  taskItemId: string;
  taskTitle: string;
  memberId: string;
  entityType: string;
  entityId: string;
}) {
  try {
    const member = await db.member.findUnique({
      where: { id: params.memberId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!member?.userId) {
      logger.warn('Unable to log task creation: member userId not found', {
        memberId: params.memberId,
        taskItemId: params.taskItemId,
      });
      return;
    }

    await db.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: member.userId,
        memberId: params.memberId,
        entityType: 'task',
        entityId: params.taskItemId,
        description: 'created this task',
        data: {
          action: 'created',
          taskItemId: params.taskItemId,
          taskTitle: params.taskTitle,
          parentEntityType: params.entityType,
          parentEntityId: params.entityId,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to log automated task creation', {
      error: error instanceof Error ? error.message : String(error),
      taskItemId: params.taskItemId,
    });
  }
}

export const vendorRiskAssessmentTask = schemaTask({
  id: VENDOR_RISK_ASSESSMENT_TASK_ID,
  queue: queue({ name: 'vendor-risk-assessment', concurrencyLimit: 5 }),
  schema: vendorRiskAssessmentPayloadSchema,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  maxDuration: 1000 * 60 * 10,
  run: async (payload) => {
    logger.info('Vendor risk assessment task started', {
      vendorId: payload.vendorId,
      organizationId: payload.organizationId,
    });

    // Dedupe: don't create multiple identical tasks for the same vendor
    const existing = await db.taskItem.findFirst({
      where: {
        organizationId: payload.organizationId,
        entityType: 'vendor' as TaskItemEntityType,
        entityId: payload.vendorId,
        title: VENDOR_RISK_ASSESSMENT_TASK_TITLE,
      },
      select: { id: true, status: true, createdById: true, assigneeId: true },
    });

    // If an existing task is already complete (i.e. not "generating"), don't create another one.
    if (existing && existing.status !== TaskItemStatus.in_progress) {
      logger.info('Risk assessment task already exists for vendor, skipping', {
        vendorId: payload.vendorId,
        taskItemId: existing.id,
      });
      return { success: true, taskItemId: existing.id, deduped: true };
    }

    const { creatorMemberId, assigneeMemberId } = await resolveTaskCreatorAndAssignee({
      organizationId: payload.organizationId,
      createdByUserId: payload.createdByUserId ?? null,
    });
    // focused frameworks
    const organizationFrameworks = getDefaultFrameworks();
    const frameworkChecklist = buildFrameworkChecklist(organizationFrameworks);

    // Create a placeholder task immediately so UI can show a skeleton while research runs.
    // If an in-progress placeholder already exists, reuse it.
    const taskItemId =
      existing?.id ??
      (
        await db.taskItem.create({
          data: {
            title: VENDOR_RISK_ASSESSMENT_TASK_TITLE,
            // Keep a structured marker so frontend can reliably detect this task type,
            // but keep status=in_progress so it renders as "generating".
            description: buildRiskAssessmentDescription({
              vendorName: payload.vendorName,
              vendorWebsite: payload.vendorWebsite ?? null,
              research: null,
              frameworkChecklist,
              organizationFrameworks,
            }),
            status: TaskItemStatus.in_progress,
            priority: TaskItemPriority.high,
            entityId: payload.vendorId,
            entityType: 'vendor',
            organizationId: payload.organizationId,
            assigneeId: assigneeMemberId,
            createdById: creatorMemberId,
          },
          select: { id: true },
        })
      ).id;

    if (!existing) {
      await logAutomatedTaskCreation({
        organizationId: payload.organizationId,
        taskItemId,
        taskTitle: VENDOR_RISK_ASSESSMENT_TASK_TITLE,
        memberId: creatorMemberId,
        entityType: 'vendor',
        entityId: payload.vendorId,
      });
    }

    const research =
      payload.withResearch && payload.vendorWebsite
        ? await firecrawlAgentVendorRiskAssessment({
            vendorName: payload.vendorName,
            vendorWebsite: payload.vendorWebsite,
          })
        : null;

    const description = buildRiskAssessmentDescription({
      vendorName: payload.vendorName,
      vendorWebsite: payload.vendorWebsite ?? null,
      research,
      frameworkChecklist,
      organizationFrameworks,
    });

    // Mark as ready for normal UX: clickable + full renderer
    await db.taskItem.update({
      where: { id: taskItemId },
      data: {
        description,
        status: TaskItemStatus.todo,
        // Keep stable creator/assignee for reused placeholders
        assigneeId: existing?.assigneeId ?? assigneeMemberId,
        updatedById: existing?.createdById ?? creatorMemberId,
      },
      select: { id: true },
    });

    logger.info('Created vendor risk assessment task item', {
      vendorId: payload.vendorId,
      taskItemId,
      researched: Boolean(research),
    });

    return { success: true, taskItemId, deduped: Boolean(existing), researched: Boolean(research) };
  },
});


