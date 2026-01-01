import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db, TaskItemPriority, TaskItemStatus } from '@trycompai/db';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { tasks } from '@trigger.dev/sdk';
import { Prisma } from '@prisma/client';
import type { TriggerVendorRiskAssessmentVendorDto } from './dto/trigger-vendor-risk-assessment.dto';
import { resolveTaskCreatorAndAssignee } from '../trigger/vendor/vendor-risk-assessment/assignee';

const normalizeWebsite = (website: string | null | undefined): string | null => {
  if (!website) return null;
  const trimmed = website.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const normalized = url.toString().replace(/\/$/, '');
    return normalized;
  } catch {
    return null;
  }
};

const VERIFY_RISK_ASSESSMENT_TASK_TITLE = 'Verify risk assessment' as const;

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  async findAllByOrganization(organizationId: string) {
    try {
      const vendors = await db.vendor.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(
        `Retrieved ${vendors.length} vendors for organization ${organizationId}`,
      );
      return vendors;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve vendors for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async findById(id: string, organizationId: string) {
    try {
      const vendor = await db.vendor.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!vendor) {
        throw new NotFoundException(
          `Vendor with ID ${id} not found in organization ${organizationId}`,
        );
      }

      this.logger.log(`Retrieved vendor: ${vendor.name} (${id})`);
      return vendor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve vendor ${id}:`, error);
      throw error;
    }
  }

  async create(
    organizationId: string,
    createVendorDto: CreateVendorDto,
    createdByUserId?: string,
  ) {
    try {
      const vendor = await db.vendor.create({
        data: {
          ...createVendorDto,
          organizationId,
        },
      });

      this.logger.log(
        `Created new vendor: ${vendor.name} (${vendor.id}) for organization ${organizationId}`,
      );

      // Trigger background task to research vendor and create risk assessment task
      try {
        const handle = await tasks.trigger('vendor-risk-assessment-task', {
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorWebsite: vendor.website,
          organizationId,
          createdByUserId: createdByUserId || null,
        });

        this.logger.log(
          `Triggered vendor risk assessment task (${handle.id}) for vendor ${vendor.id}`,
        );
      } catch (triggerError) {
        // Don't fail vendor creation if task trigger fails
        this.logger.error(
          `Failed to trigger risk assessment task for vendor ${vendor.id}:`,
          triggerError,
        );
      }

      return vendor;
    } catch (error) {
      this.logger.error(
        `Failed to create vendor for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async triggerVendorRiskAssessments(params: {
    organizationId: string;
    withResearch: boolean;
    vendors: TriggerVendorRiskAssessmentVendorDto[];
  }): Promise<{ triggered: number; batchId: string | null }> {
    const { organizationId, withResearch, vendors } = params;

    if (vendors.length === 0) {
      this.logger.log('No vendors to trigger risk assessments for');
      return { triggered: 0, batchId: null };
    }

    // If we are NOT forcing research, avoid triggering runs for vendors that already have
    // GlobalVendors riskAssessmentData. (This keeps onboarding + UI creates cheap and quiet.)
    let vendorsToTrigger = vendors;
    let skippedBecauseAlreadyHasData = 0;
    let skippedVendors: TriggerVendorRiskAssessmentVendorDto[] = [];
    let createdVerifyTasks = 0;
    let updatedVerifyTasks = 0;

    if (!withResearch) {
      const websites = vendors
        .map((v) => normalizeWebsite(v.vendorWebsite ?? null))
        .filter((w): w is string => typeof w === 'string' && w.trim() !== '');

      const existing = websites.length
        ? await db.globalVendors.findMany({
            where: {
              website: { in: websites },
              // Json fields require Prisma null sentinels (DbNull/JsonNull), not literal null
              riskAssessmentData: { not: Prisma.DbNull },
            },
            select: { website: true },
          })
        : [];

      const existingWebsiteSet = new Set(existing.map((g) => g.website));

      vendorsToTrigger = vendors.filter((v) => {
        const website = normalizeWebsite(v.vendorWebsite ?? null);
        if (!website) return true; // Let the task handle "no website" skip behavior.
        return !existingWebsiteSet.has(website);
      });

      skippedVendors = vendors.filter((v) => {
        const website = normalizeWebsite(v.vendorWebsite ?? null);
        if (!website) return false;
        return existingWebsiteSet.has(website);
      });

      skippedBecauseAlreadyHasData = vendors.length - vendorsToTrigger.length;

      // For vendors we are skipping (because GlobalVendors already has data), still ensure the human
      // "Verify risk assessment" task exists. This keeps the UI consistent without running any job.
      if (skippedVendors.length > 0) {
        const settled = await Promise.allSettled(
          skippedVendors.map(async (v) => {
            const { creatorMemberId, assigneeMemberId } = await resolveTaskCreatorAndAssignee({
              organizationId,
              createdByUserId: null,
            });

            const creatorMember = await db.member.findUnique({
              where: { id: creatorMemberId },
              select: { id: true, userId: true },
            });

            const existingVerifyTask = await db.taskItem.findFirst({
              where: {
                organizationId,
                entityType: 'vendor',
                entityId: v.vendorId,
                title: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
              },
              select: { id: true, status: true },
              orderBy: { createdAt: 'desc' },
            });

            if (!existingVerifyTask) {
              const created = await db.taskItem.create({
                data: {
                  title: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
                  description: 'Review the latest Risk Assessment and confirm it is accurate.',
                  status: TaskItemStatus.todo,
                  priority: TaskItemPriority.high,
                  entityId: v.vendorId,
                  entityType: 'vendor',
                  organizationId,
                  createdById: creatorMemberId,
                  assigneeId: assigneeMemberId,
                },
                select: { id: true },
              });

              createdVerifyTasks += 1;

              // Audit log (best-effort)
              if (creatorMember?.userId) {
                try {
                  await db.auditLog.create({
                    data: {
                      organizationId,
                      userId: creatorMember.userId,
                      memberId: creatorMember.id,
                      entityType: 'task',
                      entityId: created.id,
                      description: 'created this task',
                      data: {
                        action: 'created',
                        taskItemId: created.id,
                        taskTitle: VERIFY_RISK_ASSESSMENT_TASK_TITLE,
                        parentEntityType: 'vendor',
                        parentEntityId: v.vendorId,
                      },
                    },
                  });
                } catch {
                  // ignore
                }
              }

              return;
            }

            // If it exists but is blocked, flip it to todo (unless already done/canceled)
            if (existingVerifyTask.status === TaskItemStatus.in_progress) {
              await db.taskItem.update({
                where: { id: existingVerifyTask.id },
                data: {
                  status: TaskItemStatus.todo,
                  description: 'Review the latest Risk Assessment and confirm it is accurate.',
                  assigneeId: assigneeMemberId,
                  updatedById: creatorMemberId,
                },
              });
              updatedVerifyTasks += 1;
            }
          }),
        );

        const failures = settled.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          this.logger.warn('Some verify tasks could not be ensured for skipped vendors', {
            organizationId,
            failures: failures.length,
            skippedCount: skippedVendors.length,
          });
        }
      }
    }

    this.logger.log('Preparing to batch trigger vendor risk assessment tasks', {
      organizationId,
      vendorCount: vendors.length,
      toTriggerCount: vendorsToTrigger.length,
      skippedBecauseAlreadyHasData,
      createdVerifyTasks,
      updatedVerifyTasks,
      withResearch,
      vendorIds: vendorsToTrigger.map((v) => v.vendorId),
    });

    // Explicitly show which vendors we will trigger (and which we skipped) for observability.
    // Keep payload small: only log id/name/website.
    if (!withResearch && skippedVendors.length > 0) {
      this.logger.log('Skipping vendors (GlobalVendors already has risk assessment data)', {
        organizationId,
        skippedCount: skippedVendors.length,
        skipped: skippedVendors.map((v) => ({
          vendorId: v.vendorId,
          vendorName: v.vendorName,
          vendorWebsite: v.vendorWebsite ?? null,
        })),
      });
    }

    this.logger.log('Triggering vendors for risk assessment task', {
      organizationId,
      triggerCount: vendorsToTrigger.length,
      withResearch,
      toTrigger: vendorsToTrigger.map((v) => ({
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        vendorWebsite: v.vendorWebsite ?? null,
      })),
    });

    // Use batchTrigger for efficiency (less overhead than N individual triggers)
    const batch = vendorsToTrigger.map((v) => ({
      payload: {
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        // Keep website canonical so downstream (Trigger task) uses the same GlobalVendors key.
        vendorWebsite: normalizeWebsite(v.vendorWebsite ?? null),
        organizationId,
        createdByUserId: null,
        withResearch,
      },
    }));

    try {
      if (vendorsToTrigger.length === 0) {
        this.logger.log('No vendors need risk assessment triggering (all already have data)', {
          organizationId,
          vendorCount: vendors.length,
          withResearch,
        });
        return { triggered: 0, batchId: null };
      }

      const batchHandle = await tasks.batchTrigger('vendor-risk-assessment-task', batch);

      this.logger.log(
        `Successfully triggered ${vendorsToTrigger.length} vendor risk assessment tasks for organization ${organizationId}`,
        {
          batchId: batchHandle.batchId,
          vendorCount: vendorsToTrigger.length,
          skippedBecauseAlreadyHasData,
          requestedVendorCount: vendors.length,
        },
      );

      return {
        triggered: vendorsToTrigger.length,
        batchId: batchHandle.batchId,
      };
    } catch (error) {
      this.logger.error('Failed to batch trigger vendor risk assessment tasks', {
        organizationId,
        vendorCount: vendorsToTrigger.length,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  async updateById(
    id: string,
    organizationId: string,
    updateVendorDto: UpdateVendorDto,
  ) {
    try {
      // First check if the vendor exists in the organization
      await this.findById(id, organizationId);

      const updatedVendor = await db.vendor.update({
        where: { id },
        data: updateVendorDto,
      });

      this.logger.log(`Updated vendor: ${updatedVendor.name} (${id})`);
      return updatedVendor;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update vendor ${id}:`, error);
      throw error;
    }
  }

  async deleteById(id: string, organizationId: string) {
    try {
      // First check if the vendor exists in the organization
      const existingVendor = await this.findById(id, organizationId);

      await db.vendor.delete({
        where: { id },
      });

      this.logger.log(`Deleted vendor: ${existingVendor.name} (${id})`);
      return {
        message: 'Vendor deleted successfully',
        deletedVendor: {
          id: existingVendor.id,
          name: existingVendor.name,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete vendor ${id}:`, error);
      throw error;
    }
  }
}
