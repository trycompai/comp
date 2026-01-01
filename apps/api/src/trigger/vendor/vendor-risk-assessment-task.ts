import {
  db,
  TaskItemPriority,
  TaskItemStatus,
  VendorStatus,
  type TaskItemEntityType,
} from '@db';
import type { Prisma } from '@prisma/client';
import { logger, queue, schemaTask } from '@trigger.dev/sdk';

import { resolveTaskCreatorAndAssignee } from './vendor-risk-assessment/assignee';
import { VENDOR_RISK_ASSESSMENT_TASK_ID } from './vendor-risk-assessment/constants';
import { buildRiskAssessmentDescription } from './vendor-risk-assessment/description';
import { firecrawlAgentVendorRiskAssessment } from './vendor-risk-assessment/firecrawl-agent';
import {
  buildFrameworkChecklist,
  getDefaultFrameworks,
} from './vendor-risk-assessment/frameworks';
import { vendorRiskAssessmentPayloadSchema } from './vendor-risk-assessment/schema';

const VERIFY_RISK_ASSESSMENT_TASK_TITLE = 'Verify risk assessment' as const;

/**
 * Increments version number (v1 -> v2 -> v3, etc.)
 */
function incrementVersion(currentVersion: string | null | undefined): string {
  if (!currentVersion || !currentVersion.startsWith('v')) {
    return 'v1';
  }
  const versionNumber = parseInt(currentVersion.slice(1), 10);
  if (isNaN(versionNumber)) {
    return 'v1';
  }
  return `v${versionNumber + 1}`;
}

/**
 * Determines if research is needed based on vendor existence and data availability
 */
function shouldDoResearch(
  globalVendor: { riskAssessmentData: unknown; riskAssessmentVersion: string | null } | null,
  forceResearch: boolean,
): boolean {
  // Always do research if explicitly requested
  if (forceResearch) {
    return true;
  }

  // Do research if vendor doesn't exist in GlobalVendors or has no data
  if (!globalVendor || !globalVendor.riskAssessmentData) {
    return true;
    }

  // Otherwise, skip research (use existing data)
  return false;
}

function isJsonInputValue(value: unknown): value is Prisma.InputJsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonInputValue);
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonInputValue);
  }

  return false;
}

function parseRiskAssessmentJson(value: string): Prisma.InputJsonValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(
      `Failed to parse vendor risk assessment JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!isJsonInputValue(parsed)) {
    throw new Error('Parsed vendor risk assessment is not valid JSON');
  }

  return parsed;
}

function normalizeWebsite(website: string): string | null {
  const trimmed = website.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export const vendorRiskAssessmentTask = schemaTask({
  id: VENDOR_RISK_ASSESSMENT_TASK_ID,
  queue: queue({ name: 'vendor-risk-assessment', concurrencyLimit: 10 }),
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

    const vendor = await db.vendor.findFirst({
      where: {
        id: payload.vendorId,
        organizationId: payload.organizationId,
      },
      select: {
        id: true,
        website: true,
        status: true,
      },
    });

    if (!vendor) {
      throw new Error(
        `Vendor ${payload.vendorId} not found in org ${payload.organizationId}`,
      );
    }

    if (!vendor.website) {
      logger.info('Skipping vendor risk assessment - vendor has no website', {
        vendorId: payload.vendorId,
        organizationId: payload.organizationId,
        vendorName: payload.vendorName,
      });
      // Mark vendor as assessed even without website (no risk assessment possible)
      await db.vendor.update({
        where: { id: vendor.id },
        data: { status: VendorStatus.assessed },
      });
      return {
        success: true,
        vendorId: vendor.id,
        deduped: false,
        researched: false,
        skipped: true,
        reason: 'no_website',
        riskAssessmentVersion: null,
      };
    }

    const normalizedWebsite = normalizeWebsite(vendor.website);
    if (!normalizedWebsite) {
      logger.info('Skipping vendor risk assessment - invalid website', {
        vendorId: payload.vendorId,
        organizationId: payload.organizationId,
        vendorName: payload.vendorName,
        website: vendor.website,
      });
      await db.vendor.update({
        where: { id: vendor.id },
        data: { status: VendorStatus.assessed },
      });
      return {
        success: true,
        vendorId: vendor.id,
        deduped: false,
        researched: false,
        skipped: true,
        reason: 'invalid_website',
        riskAssessmentVersion: null,
      };
    }

    // Check GlobalVendors for existing risk assessment
    const globalVendor = await db.globalVendors.findUnique({
      where: { website: normalizedWebsite },
      select: {
        riskAssessmentVersion: true,
        riskAssessmentUpdatedAt: true,
        riskAssessmentData: true,
      },
    });

    // Determine if research is needed
    const needsResearch = shouldDoResearch(globalVendor, payload.withResearch ?? false);

    if (needsResearch) {
      const reason =
        payload.withResearch === true
          ? 'forced'
          : !globalVendor
            ? 'no_global_vendor_row'
            : 'missing_risk_assessment_data';

      logger.info('Vendor risk assessment will perform research', {
        vendorId: payload.vendorId,
        organizationId: payload.organizationId,
        vendorName: payload.vendorName,
        website: normalizedWebsite,
        reason,
        existingVersion: globalVendor?.riskAssessmentVersion ?? null,
        existingHasData: Boolean(globalVendor?.riskAssessmentData),
      });
    }

    // If we have existing data and don't need research, skip regeneration
    if (!needsResearch && globalVendor?.riskAssessmentData) {
      logger.info('Global vendor risk assessment already exists, skipping research', {
        vendorId: payload.vendorId,
        website: normalizedWebsite,
        organizationId: payload.organizationId,
        vendorName: payload.vendorName,
        forceResearch: payload.withResearch ?? false,
        riskAssessmentVersion: globalVendor.riskAssessmentVersion,
        riskAssessmentUpdatedAt: globalVendor.riskAssessmentUpdatedAt,
      });

      // Still ensure a "Verify risk assessment" task exists so humans can confirm accuracy,
      // even when we are reusing cached GlobalVendors data (no research performed).
      const { creatorMemberId, assigneeMemberId } = await resolveTaskCreatorAndAssignee({
        organizationId: payload.organizationId,
        createdByUserId: payload.createdByUserId ?? null,
      });

      const creatorMember = await db.member.findUnique({
        where: { id: creatorMemberId },
        select: { id: true, userId: true },
      });

      const existingVerifyTask = await db.taskItem.findFirst({
        where: {
          organizationId: payload.organizationId,
          entityType: 'vendor' as TaskItemEntityType,
          entityId: payload.vendorId,
          title: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
        },
        select: { id: true, status: true },
        orderBy: { createdAt: 'desc' },
      });

      const isNewTask = !existingVerifyTask;
      const verifyTaskItemId =
        existingVerifyTask?.id ??
        (
          await db.taskItem.create({
            data: {
              title: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
              description: 'Review the latest Risk Assessment and confirm it is accurate.',
              status: TaskItemStatus.todo,
              priority: TaskItemPriority.high,
              entityId: payload.vendorId,
              entityType: 'vendor',
              organizationId: payload.organizationId,
              createdById: creatorMemberId,
              assigneeId: assigneeMemberId,
            },
            select: { id: true },
          })
        ).id;

      // If task already exists but is still blocked, flip it to todo (unless done/canceled).
      if (
        existingVerifyTask?.status === TaskItemStatus.in_progress
      ) {
        await db.taskItem.update({
          where: { id: verifyTaskItemId },
          data: {
            status: TaskItemStatus.todo,
            description: 'Review the latest Risk Assessment and confirm it is accurate.',
            assigneeId: assigneeMemberId,
            updatedById: creatorMemberId,
          },
        });
      }

      // Audit log for automated task creation (best-effort)
      if (isNewTask && creatorMember?.userId) {
        try {
          await db.auditLog.create({
            data: {
              organizationId: payload.organizationId,
              userId: creatorMember.userId,
              memberId: creatorMember.id,
              entityType: 'task',
              entityId: verifyTaskItemId,
              description: 'created this task',
              data: {
                action: 'created',
                taskItemId: verifyTaskItemId,
                taskTitle: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
                parentEntityType: 'vendor',
                parentEntityId: payload.vendorId,
              },
            },
          });
        } catch (error) {
          logger.error('Failed to log task item creation:', error);
        }
      }

      // Still mark the org-specific vendor as assessed
      await db.vendor.update({
        where: { id: vendor.id },
        data: { status: VendorStatus.assessed },
      });
      return {
        success: true,
        vendorId: vendor.id,
        deduped: true,
        researched: false,
        riskAssessmentVersion: globalVendor.riskAssessmentVersion ?? 'v1',
      };
    }

    // Calculate next version (increment if updating existing, v1 if new)
    const nextVersion = incrementVersion(globalVendor?.riskAssessmentVersion);

    // Mark vendor as in-progress immediately so UI can show "generating"
    await db.vendor.update({
      where: { id: vendor.id },
      data: {
        status: VendorStatus.in_progress,
      },
    });

    const { creatorMemberId, assigneeMemberId } = await resolveTaskCreatorAndAssignee({
      organizationId: payload.organizationId,
      createdByUserId: payload.createdByUserId ?? null,
    });

    // Get creator member with userId for activity log
    const creatorMember = await db.member.findUnique({
      where: { id: creatorMemberId },
      select: { id: true, userId: true },
    });

    if (!creatorMember?.userId) {
      logger.warn('Creator member has no userId, skipping activity log creation', {
        creatorMemberId,
        organizationId: payload.organizationId,
      });
    }

    // Ensure a "Verify risk assessment" task exists immediately, but keep it blocked while generation runs.
    // We represent "blocked" as status=in_progress to prevent the team from treating it as ready.
    const existingVerifyTask = await db.taskItem.findFirst({
      where: {
        organizationId: payload.organizationId,
        entityType: 'vendor' as TaskItemEntityType,
        entityId: payload.vendorId,
        title: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
      },
      select: { id: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    const isNewTask = !existingVerifyTask;
    const verifyTaskItemId =
      existingVerifyTask?.id ??
      (
        await db.taskItem.create({
          data: {
            title: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
            description: 'Waiting for risk assessment generation to complete.',
            status: TaskItemStatus.in_progress,
            priority: TaskItemPriority.high,
            entityId: payload.vendorId,
            entityType: 'vendor',
            organizationId: payload.organizationId,
            createdById: creatorMemberId,
            assigneeId: assigneeMemberId,
          },
          select: { id: true },
        })
      ).id;

    // Create activity log for new task creation
    if (isNewTask && creatorMember?.userId) {
      try {
        await db.auditLog.create({
          data: {
        organizationId: payload.organizationId,
            userId: creatorMember.userId,
        memberId: creatorMemberId,
            entityType: 'task',
            entityId: verifyTaskItemId,
            description: 'created this task',
            data: {
              action: 'created',
              taskItemId: verifyTaskItemId,
              taskTitle: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
              parentEntityType: 'vendor',
              parentEntityId: payload.vendorId,
            },
          },
      });
      } catch (error) {
        logger.error('Failed to log task item creation:', error);
        // Don't throw - audit log failures should not block operations
      }
    }

    // Focused frameworks
    const organizationFrameworks = getDefaultFrameworks();
    const frameworkChecklist = buildFrameworkChecklist(organizationFrameworks);

    // Do research if needed (vendor doesn't exist, no data, or explicitly requested)
    const research = needsResearch && payload.vendorWebsite
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

    const data = parseRiskAssessmentJson(description);

    // Upsert GlobalVendors with risk assessment data (shared across all organizations)
    // Version is auto-incremented (v1 -> v2 -> v3, etc.)
    await db.globalVendors.upsert({
      where: { website: normalizedWebsite },
      create: {
        website: normalizedWebsite,
        company_name: payload.vendorName,
        riskAssessmentData: data,
        riskAssessmentVersion: nextVersion,
        riskAssessmentUpdatedAt: new Date(),
      },
      update: {
        company_name: payload.vendorName,
        riskAssessmentData: data,
        riskAssessmentVersion: nextVersion,
        riskAssessmentUpdatedAt: new Date(),
      },
    });

    // Mark org-specific vendor as assessed
    await db.vendor.update({
      where: { id: vendor.id },
      data: {
        status: VendorStatus.assessed,
      },
    });

    // Flip verify task to "todo" once the risk assessment is ready (only if it wasn't already completed/canceled).
    if (
      existingVerifyTask?.status !== TaskItemStatus.done &&
      existingVerifyTask?.status !== TaskItemStatus.canceled
    ) {
      await db.taskItem.update({
        where: { id: verifyTaskItemId },
        data: {
        status: TaskItemStatus.todo,
          description: 'Review the latest Risk Assessment and confirm it is accurate.',
          // Keep stable assignee/creator
          assigneeId: assigneeMemberId,
          updatedById: creatorMemberId,
      },
      select: { id: true },
    });
    }

    logger.info('Stored vendor risk assessment on vendor', {
      vendorId: payload.vendorId,
      website: vendor.website,
      researched: Boolean(research),
      version: nextVersion,
      verifyTaskItemId,
    });

    return {
      success: true,
      vendorId: vendor.id,
      deduped: false,
      researched: Boolean(research),
      riskAssessmentVersion: nextVersion,
      verifyTaskItemId,
    };
  },
});


