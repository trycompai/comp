import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db, TaskItemPriority, TaskItemStatus } from '@trycompai/db';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { tasks } from '@trigger.dev/sdk';
import { Prisma } from '@prisma/client';
import type { TriggerVendorRiskAssessmentVendorDto } from './dto/trigger-vendor-risk-assessment.dto';
import { resolveTaskCreatorAndAssignee } from '../trigger/vendor/vendor-risk-assessment/assignee';

const normalizeWebsite = (
  website: string | null | undefined,
): string | null => {
  if (!website) return null;
  const trimmed = website.trim();
  if (!trimmed) return null;

  // Require explicit protocol (do not silently force https)
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const protocol = url.protocol.toLowerCase();
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const port = url.port ? `:${url.port}` : '';
    return `${protocol}//${hostname}${port}`;
  } catch {
    return null;
  }
};

/**
 * Extract domain from website URL for GlobalVendors lookup.
 * Removes www. prefix and returns just the domain (e.g., "example.com").
 */
const extractDomain = (website: string | null | undefined): string | null => {
  if (!website) return null;

  const trimmed = website.trim();
  if (!trimmed) return null;

  try {
    // Add protocol if missing to make URL parsing work
    const urlString = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(urlString);
    // Remove www. prefix and return just the domain
    return url.hostname.toLowerCase().replace(/^www\./, '');
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
        include: {
          assignee: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      if (!vendor) {
        throw new NotFoundException(
          `Vendor with ID ${id} not found in organization ${organizationId}`,
        );
      }

      // Fetch risk assessment from GlobalVendors if vendor has a website
      const domain = extractDomain(vendor.website);
      let globalVendorData: {
        website: string;
        riskAssessmentData: Prisma.JsonValue;
        riskAssessmentVersion: string | null;
        riskAssessmentUpdatedAt: Date | null;
      } | null = null;

      if (domain) {
        const duplicates = await db.globalVendors.findMany({
          where: {
            website: {
              contains: domain,
            },
          },
          select: {
            website: true,
            riskAssessmentData: true,
            riskAssessmentVersion: true,
            riskAssessmentUpdatedAt: true,
          },
          orderBy: [{ riskAssessmentUpdatedAt: 'desc' }, { createdAt: 'desc' }],
        });

        // Prefer record WITH risk assessment data (most recent)
        globalVendorData =
          duplicates.find((gv) => gv.riskAssessmentData !== null) ??
          duplicates[0] ??
          null;
      }

      // Merge GlobalVendors risk assessment data into response
      const vendorWithRiskAssessment = {
        ...vendor,
        riskAssessmentData: globalVendorData?.riskAssessmentData ?? null,
        riskAssessmentVersion: globalVendorData?.riskAssessmentVersion ?? null,
        riskAssessmentUpdatedAt:
          globalVendorData?.riskAssessmentUpdatedAt ?? null,
      };

      this.logger.log(`Retrieved vendor: ${vendor.name} (${id})`);
      return vendorWithRiskAssessment;
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
      // Extract domains for all vendors and check which ones already have risk assessment data
      const vendorDomains = vendors
        .map((v) => ({
          vendor: v,
          domain: extractDomain(v.vendorWebsite ?? null),
        }))
        .filter(
          (
            vd,
          ): vd is {
            vendor: TriggerVendorRiskAssessmentVendorDto;
            domain: string;
          } => vd.domain !== null,
        );

      // Check which domains already have risk assessment data using contains filter
      const existingDomains = new Set<string>();
      if (vendorDomains.length > 0) {
        const uniqueDomains = Array.from(
          new Set(vendorDomains.map((vd) => vd.domain)),
        );
        const existing = await db.globalVendors.findMany({
          where: {
            OR: uniqueDomains.map((domain) => ({
              website: { contains: domain },
            })),
            // Json fields require Prisma null sentinels (DbNull/JsonNull), not literal null
            riskAssessmentData: { not: Prisma.DbNull },
          },
          select: { website: true },
        });

        // Extract domains from existing records to build the set
        for (const gv of existing) {
          const domain = extractDomain(gv.website);
          if (domain) {
            existingDomains.add(domain);
          }
        }
      }

      vendorsToTrigger = vendors.filter((v) => {
        const domain = extractDomain(v.vendorWebsite ?? null);
        if (!domain) return true; // Let the task handle "no website" skip behavior.
        return !existingDomains.has(domain);
      });

      skippedVendors = vendors.filter((v) => {
        const domain = extractDomain(v.vendorWebsite ?? null);
        if (!domain) return false;
        return existingDomains.has(domain);
      });

      skippedBecauseAlreadyHasData = vendors.length - vendorsToTrigger.length;

      // For vendors we are skipping (because GlobalVendors already has data), still ensure the human
      // "Verify risk assessment" task exists. This keeps the UI consistent without running any job.
      if (skippedVendors.length > 0) {
        const settled = await Promise.allSettled(
          skippedVendors.map(async (v) => {
            const { creatorMemberId, assigneeMemberId } =
              await resolveTaskCreatorAndAssignee({
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
                  description:
                    'Review the latest Risk Assessment and confirm it is accurate.',
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
                  description:
                    'Review the latest Risk Assessment and confirm it is accurate.',
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
          this.logger.warn(
            'Some verify tasks could not be ensured for skipped vendors',
            {
              organizationId,
              failures: failures.length,
              skippedCount: skippedVendors.length,
            },
          );
        }
      }
    }

    // Simplified logging: clear lists of what needs research vs what doesn't
    if (!withResearch && skippedVendors.length > 0) {
      this.logger.log(
        '✅ Vendors that DO NOT need research (already have data)',
        {
          count: skippedVendors.length,
          vendors: skippedVendors.map(
            (v) => `${v.vendorName} (${v.vendorWebsite ?? 'no website'})`,
          ),
        },
      );
    }

    if (vendorsToTrigger.length > 0) {
      this.logger.log('🔍 Vendors that NEED research (missing data)', {
        count: vendorsToTrigger.length,
        withResearch,
        vendors: vendorsToTrigger.map(
          (v) => `${v.vendorName} (${v.vendorWebsite ?? 'no website'})`,
        ),
      });
    } else {
      this.logger.log(
        '✅ All vendors already have risk assessment data - no research needed',
        {
          totalVendors: vendors.length,
        },
      );
    }

    // Use batchTrigger for efficiency (less overhead than N individual triggers)
    // If we're triggering the task, it means research is needed (we've already filtered)
    // So always pass withResearch: true when triggering
    const batch = vendorsToTrigger.map((v) => ({
      payload: {
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        // Keep website canonical so downstream (Trigger task) uses the same GlobalVendors key.
        vendorWebsite: normalizeWebsite(v.vendorWebsite ?? null),
        organizationId,
        createdByUserId: null,
        withResearch: true, // Always true - if task is triggered, research is needed
      },
    }));

    try {
      if (vendorsToTrigger.length === 0) {
        return { triggered: 0, batchId: null };
      }

      const batchHandle = await tasks.batchTrigger(
        'vendor-risk-assessment-task',
        batch,
      );

      this.logger.log('✅ Triggered risk assessment tasks', {
        count: vendorsToTrigger.length,
        batchId: batchHandle.batchId,
      });

      return {
        triggered: vendorsToTrigger.length,
        batchId: batchHandle.batchId,
      };
    } catch (error) {
      this.logger.error(
        'Failed to batch trigger vendor risk assessment tasks',
        {
          organizationId,
          vendorCount: vendorsToTrigger.length,
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
      );
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
