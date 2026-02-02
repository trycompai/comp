import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { db, PolicyStatus, Prisma } from '@trycompai/db';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { AttachmentsService } from '../attachments/attachments.service';
import { PolicyPdfRendererService } from '../trust-portal/policy-pdf-renderer.service';
import type { CreatePolicyDto } from './dto/create-policy.dto';
import type { UpdatePolicyDto } from './dto/update-policy.dto';
import type {
  CreateVersionDto,
  PublishVersionDto,
  SubmitForApprovalDto,
  UpdateVersionContentDto,
} from './dto/version.dto';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);
  private readonly versionCreateRetries = 3;

  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly pdfRendererService: PolicyPdfRendererService,
  ) {}

  async findAll(
    organizationId: string,
    visibilityFilter: Prisma.PolicyWhereInput = {},
  ) {
    try {
      const policies = await db.policy.findMany({
        where: { organizationId, ...visibilityFilter },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          content: true,
          draftContent: true,
          frequency: true,
          department: true,
          isRequiredToSign: true,
          signedBy: true,
          reviewDate: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          lastArchivedAt: true,
          lastPublishedAt: true,
          organizationId: true,
          assigneeId: true,
          approverId: true,
          policyTemplateId: true,
          currentVersionId: true,
          pendingVersionId: true,
          displayFormat: true,
          pdfUrl: true,
          visibility: true,
          visibleToDepartments: true,
          assignee: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      this.logger.log(
        `Retrieved ${policies.length} policies for organization ${organizationId}`,
      );
      return policies;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve policies for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async findById(id: string, organizationId: string) {
    try {
      const policy = await db.policy.findFirst({
        where: {
          id,
          organizationId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          content: true,
          draftContent: true,
          frequency: true,
          department: true,
          isRequiredToSign: true,
          signedBy: true,
          reviewDate: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          lastArchivedAt: true,
          lastPublishedAt: true,
          organizationId: true,
          assigneeId: true,
          approverId: true,
          policyTemplateId: true,
          currentVersionId: true,
          pendingVersionId: true,
          displayFormat: true,
          pdfUrl: true,
          visibility: true,
          visibleToDepartments: true,
          approver: {
            include: {
              user: true,
            },
          },
          currentVersion: {
            select: {
              id: true,
              content: true,
              pdfUrl: true,
              version: true,
            },
          },
        },
      });

      if (!policy) {
        throw new NotFoundException(`Policy with ID ${id} not found`);
      }

      this.logger.log(`Retrieved policy: ${policy.name} (${id})`);
      return policy;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to retrieve policy ${id}:`, error);
      throw error;
    }
  }

  async create(organizationId: string, createData: CreatePolicyDto) {
    try {
      const contentValue = createData.content as Prisma.InputJsonValue[];

      // Create policy with version 1 in a transaction
      const policy = await db.$transaction(async (tx) => {
        // Create the policy first (without currentVersionId)
        const newPolicy = await tx.policy.create({
          data: {
            ...createData,
            // Ensure JSON[] type compatibility for Prisma
            content: contentValue,
            organizationId,
            status: createData.status || 'draft',
            isRequiredToSign: createData.isRequiredToSign ?? true,
          },
        });

        // Create version 1 as a draft
        const version = await tx.policyVersion.create({
          data: {
            policyId: newPolicy.id,
            version: 1,
            content: contentValue,
            changelog: 'Initial version',
          },
        });

        // Update policy to set currentVersionId
        const updatedPolicy = await tx.policy.update({
          where: { id: newPolicy.id },
          data: { currentVersionId: version.id },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            content: true,
            frequency: true,
            department: true,
            isRequiredToSign: true,
            signedBy: true,
            reviewDate: true,
            isArchived: true,
            createdAt: true,
            updatedAt: true,
            lastArchivedAt: true,
            lastPublishedAt: true,
            organizationId: true,
            assigneeId: true,
            approverId: true,
            policyTemplateId: true,
            currentVersionId: true,
          },
        });

        return updatedPolicy;
      });

      this.logger.log(`Created policy: ${policy.name} (${policy.id})`);
      return policy;
    } catch (error) {
      this.logger.error(
        `Failed to create policy for organization ${organizationId}:`,
        error,
      );
      throw error;
    }
  }

  async updateById(
    id: string,
    organizationId: string,
    updateData: UpdatePolicyDto,
  ) {
    try {
      // First check if the policy exists and belongs to the organization
      const existingPolicy = await db.policy.findFirst({
        where: {
          id,
          organizationId,
        },
        select: { id: true, name: true },
      });

      if (!existingPolicy) {
        throw new NotFoundException(`Policy with ID ${id} not found`);
      }

      // Prepare update data with special handling for status changes
      const updatePayload: Record<string, unknown> = { ...updateData };

      // If status is being changed to published, update lastPublishedAt
      if (updateData.status === 'published') {
        updatePayload.lastPublishedAt = new Date();
      }

      // If isArchived is being set to true, update lastArchivedAt
      if (updateData.isArchived === true) {
        updatePayload.lastArchivedAt = new Date();
      }

      // Coerce content to Prisma JSON[] input if provided
      if (Array.isArray(updateData.content)) {
        updatePayload.content = updateData.content as Prisma.InputJsonValue[];
      }

      // Update the policy
      const updatedPolicy = await db.policy.update({
        where: { id },
        data: updatePayload,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          content: true,
          frequency: true,
          department: true,
          isRequiredToSign: true,
          signedBy: true,
          reviewDate: true,
          isArchived: true,
          createdAt: true,
          updatedAt: true,
          lastArchivedAt: true,
          lastPublishedAt: true,
          organizationId: true,
          assigneeId: true,
          approverId: true,
          policyTemplateId: true,
        },
      });

      this.logger.log(`Updated policy: ${updatedPolicy.name} (${id})`);
      return updatedPolicy;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update policy ${id}:`, error);
      throw error;
    }
  }

  async deleteById(id: string, organizationId: string) {
    try {
      // First check if the policy exists and belongs to the organization
      // Include versions to clean up their PDFs from S3
      const policy = await db.policy.findFirst({
        where: {
          id,
          organizationId,
        },
        select: {
          id: true,
          name: true,
          pdfUrl: true,
          versions: {
            select: { pdfUrl: true },
          },
        },
      });

      if (!policy) {
        throw new NotFoundException(`Policy with ID ${id} not found`);
      }

      // Clean up S3 files before cascade delete
      const pdfUrlsToDelete: string[] = [];

      // Add policy-level PDF if exists
      if (policy.pdfUrl) {
        pdfUrlsToDelete.push(policy.pdfUrl);
      }

      // Add all version PDFs
      for (const version of policy.versions) {
        if (version.pdfUrl) {
          pdfUrlsToDelete.push(version.pdfUrl);
        }
      }

      // Delete all PDFs from S3 (don't fail if S3 delete fails)
      if (pdfUrlsToDelete.length > 0) {
        await Promise.allSettled(
          pdfUrlsToDelete.map((pdfUrl) =>
            this.attachmentsService.deletePolicyVersionPdf(pdfUrl).catch((err) => {
              this.logger.warn(`Failed to delete PDF from S3: ${pdfUrl}`, err);
            }),
          ),
        );
      }

      // Delete the policy (versions are cascade deleted)
      await db.policy.delete({
        where: { id },
      });

      this.logger.log(`Deleted policy: ${policy.name} (${id})`);
      return { success: true, deletedPolicy: policy };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete policy ${id}:`, error);
      throw error;
    }
  }

  async getVersions(policyId: string, organizationId: string) {
    const policy = await db.policy.findFirst({
      where: { id: policyId, organizationId },
      select: { id: true, currentVersionId: true, pendingVersionId: true },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    const versions = await db.policyVersion.findMany({
      where: { policyId },
      orderBy: { version: 'desc' },
      include: {
        publishedBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return {
      versions,
      currentVersionId: policy.currentVersionId,
      pendingVersionId: policy.pendingVersionId,
    };
  }

  async createVersion(
    policyId: string,
    organizationId: string,
    dto: CreateVersionDto,
    userId?: string,
  ) {
    const memberId = await this.getMemberId(organizationId, userId);

    const policy = await db.policy.findUnique({
      where: { id: policyId, organizationId },
      include: {
        currentVersion: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    let sourceVersion = policy.currentVersion;
    if (dto.sourceVersionId) {
      const requestedVersion = await db.policyVersion.findUnique({
        where: { id: dto.sourceVersionId },
      });

      if (!requestedVersion || requestedVersion.policyId !== policyId) {
        throw new NotFoundException('Source version not found');
      }

      sourceVersion = requestedVersion;
    }

    const contentForVersion = sourceVersion
      ? (sourceVersion.content as Prisma.InputJsonValue[])
      : (policy.content as Prisma.InputJsonValue[]);
    const sourcePdfUrl = sourceVersion?.pdfUrl ?? policy.pdfUrl;

    if (!contentForVersion || contentForVersion.length === 0) {
      throw new BadRequestException('No content to create version from');
    }

    // S3 copy is done AFTER the transaction to prevent orphaned files on retry
    let createdVersion: { versionId: string; version: number } | null = null;

    for (let attempt = 1; attempt <= this.versionCreateRetries; attempt += 1) {
      try {
        createdVersion = await db.$transaction(async (tx) => {
          const latestVersion = await tx.policyVersion.findFirst({
            where: { policyId },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          const nextVersion = (latestVersion?.version ?? 0) + 1;

          // Create version WITHOUT PDF first (S3 copy happens after transaction)
          const newVersion = await tx.policyVersion.create({
            data: {
              policyId,
              version: nextVersion,
              content: contentForVersion,
              pdfUrl: null, // Will be updated after S3 copy
              publishedById: memberId,
              changelog: dto.changelog ?? null,
            },
          });

          return {
            versionId: newVersion.id,
            version: nextVersion,
          };
        });

        // Transaction succeeded, break out of retry loop
        break;
      } catch (error) {
        if (
          this.isUniqueConstraintError(error) &&
          attempt < this.versionCreateRetries
        ) {
          continue;
        }
        throw error;
      }
    }

    if (!createdVersion) {
      throw new Error('Failed to create policy version after retries');
    }

    // Now copy S3 file OUTSIDE the transaction (no orphaned files on retry)
    if (sourcePdfUrl) {
      try {
        const newS3Key = `${organizationId}/policies/${policyId}/v${createdVersion.version}-${Date.now()}.pdf`;
        const newPdfUrl = await this.attachmentsService.copyPolicyVersionPdf(
          sourcePdfUrl,
          newS3Key,
        );

        if (newPdfUrl) {
          // Update the version with the PDF URL
          await db.policyVersion.update({
            where: { id: createdVersion.versionId },
            data: { pdfUrl: newPdfUrl },
          });
        }
      } catch (error) {
        // Log but don't fail - version was created successfully, just without PDF
        this.logger.warn(
          `Failed to copy PDF for new version ${createdVersion.versionId}:`,
          error,
        );
      }
    }

    return createdVersion;
  }

  async updateVersionContent(
    policyId: string,
    versionId: string,
    organizationId: string,
    dto: UpdateVersionContentDto,
  ) {
    const version = await db.policyVersion.findUnique({
      where: { id: versionId },
      include: {
        policy: {
          select: {
            id: true,
            organizationId: true,
            currentVersionId: true,
            pendingVersionId: true,
          },
        },
      },
    });

    if (
      !version ||
      version.policy.id !== policyId ||
      version.policy.organizationId !== organizationId
    ) {
      throw new NotFoundException('Version not found');
    }

    if (version.id === version.policy.currentVersionId) {
      throw new BadRequestException(
        'Cannot edit the published version. Create a new version to make changes.',
      );
    }

    if (version.id === version.policy.pendingVersionId) {
      throw new BadRequestException(
        'Cannot edit a version that is pending approval.',
      );
    }

    const processedContent = JSON.parse(
      JSON.stringify(dto.content ?? []),
    ) as Prisma.InputJsonValue[];

    await db.policyVersion.update({
      where: { id: versionId },
      data: { content: processedContent },
    });

    return { versionId };
  }

  async deleteVersion(
    policyId: string,
    versionId: string,
    organizationId: string,
  ) {
    const policy = await db.policy.findUnique({
      where: { id: policyId, organizationId },
      select: {
        id: true,
        currentVersionId: true,
        pendingVersionId: true,
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    const version = await db.policyVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        policyId: true,
        pdfUrl: true,
        version: true,
      },
    });

    if (!version || version.policyId !== policyId) {
      throw new NotFoundException('Version not found');
    }

    if (version.id === policy.currentVersionId) {
      throw new BadRequestException('Cannot delete the published version');
    }

    if (version.id === policy.pendingVersionId) {
      throw new BadRequestException('Cannot delete a version pending approval');
    }

    if (version.pdfUrl) {
      try {
        await this.attachmentsService.deletePolicyVersionPdf(version.pdfUrl);
      } catch (error) {
        this.logger.warn(
          `Failed to delete version PDF for version ${version.id}`,
          error,
        );
      }
    }

    await db.policyVersion.delete({
      where: { id: versionId },
    });

    return { deletedVersion: version.version };
  }

  async publishVersion(
    policyId: string,
    organizationId: string,
    dto: PublishVersionDto,
    userId?: string,
  ) {
    const memberId = await this.getMemberId(organizationId, userId);

    const policy = await db.policy.findUnique({
      where: { id: policyId, organizationId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    const contentToPublish = (
      policy.draftContent && policy.draftContent.length > 0
        ? policy.draftContent
        : policy.content
    ) as Prisma.InputJsonValue[];

    if (!contentToPublish || contentToPublish.length === 0) {
      throw new BadRequestException('No content to publish');
    }

    for (let attempt = 1; attempt <= this.versionCreateRetries; attempt += 1) {
      try {
        return await db.$transaction(async (tx) => {
          const latestVersion = await tx.policyVersion.findFirst({
            where: { policyId },
            orderBy: { version: 'desc' },
            select: { version: true },
          });
          const nextVersion = (latestVersion?.version ?? 0) + 1;

          const newVersion = await tx.policyVersion.create({
            data: {
              policyId,
              version: nextVersion,
              content: contentToPublish,
              pdfUrl: policy.pdfUrl,
              publishedById: memberId,
              changelog: dto.changelog ?? null,
            },
          });

          await tx.policy.update({
            where: { id: policyId },
            data: {
              content: contentToPublish,
              draftContent: contentToPublish,
              lastPublishedAt: new Date(),
              status: 'published',
              // Clear any pending approval since we're publishing directly
              pendingVersionId: null,
              approverId: null,
              // Clear signatures - employees must re-acknowledge new content
              signedBy: [],
              ...(dto.setAsActive !== false && {
                currentVersionId: newVersion.id,
              }),
            },
          });

          return {
            versionId: newVersion.id,
            version: nextVersion,
          };
        });
      } catch (error) {
        if (
          this.isUniqueConstraintError(error) &&
          attempt < this.versionCreateRetries
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to publish policy version after retries');
  }

  async setActiveVersion(
    policyId: string,
    versionId: string,
    organizationId: string,
  ) {
    const policy = await db.policy.findUnique({
      where: { id: policyId, organizationId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    if (policy.pendingVersionId && policy.pendingVersionId !== versionId) {
      throw new BadRequestException(
        'Another version is already pending approval',
      );
    }

    const version = await db.policyVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.policyId !== policyId) {
      throw new NotFoundException('Version not found');
    }

    await db.policy.update({
      where: { id: policyId },
      data: {
        currentVersionId: versionId,
        content: version.content as Prisma.InputJsonValue[],
        draftContent: version.content as Prisma.InputJsonValue[], // Sync draft to prevent "unpublished changes" UI bug
        status: 'published',
        // Clear pending approval state since we're directly activating a version
        pendingVersionId: null,
        approverId: null,
        // Clear signatures - employees must re-acknowledge new content
        signedBy: [],
      },
    });

    return {
      versionId: version.id,
      version: version.version,
    };
  }

  async submitForApproval(
    policyId: string,
    versionId: string,
    organizationId: string,
    dto: SubmitForApprovalDto,
  ) {
    const policy = await db.policy.findUnique({
      where: { id: policyId, organizationId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${policyId} not found`);
    }

    const version = await db.policyVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.policyId !== policyId) {
      throw new NotFoundException('Version not found');
    }

    // Cannot submit the already-active version for approval
    if (versionId === policy.currentVersionId) {
      throw new BadRequestException(
        'Cannot submit the currently published version for approval',
      );
    }

    const approver = await db.member.findUnique({
      where: { id: dto.approverId },
    });

    if (!approver || approver.organizationId !== organizationId) {
      throw new NotFoundException('Approver not found');
    }

    // Cannot assign a deactivated member as approver - they can't log in to approve
    if (approver.deactivated) {
      throw new BadRequestException('Cannot assign a deactivated member as approver');
    }

    await db.policy.update({
      where: { id: policyId },
      data: {
        pendingVersionId: versionId,
        status: PolicyStatus.needs_review,
        approverId: dto.approverId,
      },
    });

    return {
      versionId: version.id,
      version: version.version,
    };
  }

  private async getMemberId(
    organizationId: string,
    userId?: string,
  ): Promise<string | null> {
    if (!userId) {
      return null;
    }

    const member = await db.member.findFirst({
      where: {
        userId,
        organizationId,
        deactivated: false,
      },
      select: { id: true },
    });

    return member?.id ?? null;
  }

  /**
   * Convert hex color to RGB values (0-1 range for pdf-lib)
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return { r, g, b };
  }

  /**
   * Get accent color from organization or use default
   */
  private getAccentColor(primaryColor: string | null | undefined): {
    r: number;
    g: number;
    b: number;
  } {
    // Default project primary color: dark teal/green (#004D3D)
    const defaultColor = { r: 0, g: 0.302, b: 0.239 };

    if (!primaryColor) {
      return defaultColor;
    }

    const color = this.hexToRgb(primaryColor);

    if (
      Number.isNaN(color.r) ||
      Number.isNaN(color.g) ||
      Number.isNaN(color.b)
    ) {
      this.logger.warn(
        `Invalid primary color format, using default: ${primaryColor}`,
      );
      return defaultColor;
    }

    return color;
  }

  /**
   * Download all published policies as a single PDF bundle (no watermark)
   */
  async downloadAllPoliciesPdf(organizationId: string) {
    // Get organization info
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, primaryColor: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get all published policies with currentVersion
    const policies = await db.policy.findMany({
      where: {
        organizationId,
        status: 'published',
        isArchived: false,
      },
      select: {
        id: true,
        name: true,
        content: true,
        pdfUrl: true,
        currentVersion: {
          select: {
            content: true,
            pdfUrl: true,
          },
        },
      },
      orderBy: [{ lastPublishedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    if (policies.length === 0) {
      throw new NotFoundException('No published policies available');
    }

    const mergedPdf = await PDFDocument.create();
    const organizationName = organization.name || 'Organization';
    const accentColor = this.getAccentColor(organization.primaryColor);

    // Embed fonts once before the loop (expensive operation)
    const helveticaBold = await mergedPdf.embedFont(
      StandardFonts.HelveticaBold,
    );
    const helvetica = await mergedPdf.embedFont(StandardFonts.Helvetica);

    // Step 1: Fetch/render all PDFs in parallel (expensive I/O operations)
    type PreparedPolicy = {
      policy: (typeof policies)[0];
      pdfBuffer: Buffer;
      isUploaded: boolean;
    };

    // Helper to get effective content and pdfUrl (version first, fallback to policy)
    const getEffectiveData = (policy: (typeof policies)[0]) => {
      const content = policy.currentVersion?.content ?? policy.content;
      const pdfUrl = policy.currentVersion?.pdfUrl ?? policy.pdfUrl;
      return { content, pdfUrl };
    };

    const preparePolicy = async (
      policy: (typeof policies)[0],
    ): Promise<PreparedPolicy> => {
      const { content, pdfUrl } = getEffectiveData(policy);
      const hasUploadedPdf = pdfUrl && pdfUrl.trim() !== '';

      if (hasUploadedPdf) {
        try {
          const pdfBuffer = await this.attachmentsService.getObjectBuffer(
            pdfUrl!,
          );
          return {
            policy,
            pdfBuffer: Buffer.from(pdfBuffer),
            isUploaded: true,
          };
        } catch (error) {
          this.logger.warn(
            `Failed to fetch uploaded PDF for policy ${policy.id}, falling back to content rendering`,
            error,
          );
        }
      }

      // Render from content (either no pdfUrl or fetch failed)
      const renderedBuffer = this.pdfRendererService.renderPoliciesPdfBuffer(
        [{ name: policy.name, content }],
        undefined, // We'll add org header during merge
        organization.primaryColor,
        policies.length,
      );
      return { policy, pdfBuffer: renderedBuffer, isUploaded: false };
    };

    const preparedPolicies = await Promise.all(policies.map(preparePolicy));

    // Step 2: Merge PDFs sequentially (must be sequential for PDFDocument operations)
    // Helper to add content-rendered policy to merged PDF
    const addContentRenderedPolicy = async (
      policy: (typeof policies)[0],
      addOrgHeader: boolean,
    ) => {
      const { content } = getEffectiveData(policy);
      const renderedBuffer = this.pdfRendererService.renderPoliciesPdfBuffer(
        [{ name: policy.name, content }],
        addOrgHeader ? organizationName : undefined,
        organization.primaryColor,
        policies.length,
      );
      const renderedPdf = await PDFDocument.load(renderedBuffer);
      const copiedPages = await mergedPdf.copyPages(
        renderedPdf,
        renderedPdf.getPageIndices(),
      );
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    };

    let isFirst = true;
    for (const { policy, pdfBuffer, isUploaded } of preparedPolicies) {
      if (isUploaded) {
        try {
          const uploadedPdf = await PDFDocument.load(pdfBuffer, {
            ignoreEncryption: true,
          });

          // Rebuild the FIRST page: embed original page into a taller page
          const originalFirstPage = uploadedPdf.getPage(0);
          const { width, height } = originalFirstPage.getSize();

          const headerHeight = isFirst ? 120 : 60;
          const embeddedFirstPage =
            await mergedPdf.embedPage(originalFirstPage);
          const rebuiltFirstPage = mergedPdf.addPage([
            width,
            height + headerHeight,
          ]);

          rebuiltFirstPage.drawPage(embeddedFirstPage, {
            x: 0,
            y: 0,
            width,
            height,
          });

          let yPos = height + headerHeight - 25;

          if (isFirst) {
            rebuiltFirstPage.drawLine({
              start: { x: 20, y: yPos + 8 },
              end: { x: width - 20, y: yPos + 8 },
              thickness: 2,
              color: rgb(accentColor.r, accentColor.g, accentColor.b),
            });

            rebuiltFirstPage.drawText(`${organizationName} - All Policies`, {
              x: 20,
              y: yPos - 14,
              size: 14,
              font: helveticaBold,
              color: rgb(0, 0, 0),
            });

            const generatedDate = new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            rebuiltFirstPage.drawText(
              `Generated: ${generatedDate} | Total: ${policies.length} policies`,
              {
                x: width - 180,
                y: yPos - 14,
                size: 8,
                font: helvetica,
                color: rgb(0.5, 0.5, 0.5),
              },
            );

            yPos -= 34;
            isFirst = false;
          }

          rebuiltFirstPage.drawRectangle({
            x: 55,
            y: yPos - 40,
            width: 10,
            height: 26,
            color: rgb(accentColor.r, accentColor.g, accentColor.b),
          });

          rebuiltFirstPage.drawText(`POLICY: ${policy.name}`, {
            x: 75,
            y: yPos - 34,
            size: 16,
            font: helveticaBold,
            color: rgb(0.12, 0.16, 0.23),
          });

          // Remaining pages unchanged (page 2..n)
          if (uploadedPdf.getPageCount() > 1) {
            const copiedRemainingPages = await mergedPdf.copyPages(
              uploadedPdf,
              uploadedPdf.getPageIndices().slice(1),
            );
            for (const page of copiedRemainingPages) {
              mergedPdf.addPage(page);
            }
          }
        } catch (error) {
          // PDF is corrupted/malformed, fall back to content rendering
          this.logger.warn(
            `Failed to parse uploaded PDF for policy ${policy.id}, falling back to content rendering`,
            error,
          );
          await addContentRenderedPolicy(policy, isFirst);
          isFirst = false;
        }
      } else {
        // Content was already rendered, but re-render if first (needs org header)
        await addContentRenderedPolicy(policy, isFirst);
        isFirst = false;
      }
    }

    // Add page numbers to all pages in the merged PDF
    const pages = mergedPdf.getPages();
    const totalPages = pages.length;
    // helvetica font already embedded above

    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const { width } = page.getSize();
      const pageNumber = i + 1;

      page.drawText(`Page ${pageNumber} of ${totalPages}`, {
        x: width / 2 - 30,
        y: 15,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBuffer = Buffer.from(await mergedPdf.save());

    // Upload to S3 (no watermarking for internal use)
    const timestamp = Date.now();
    const key = await this.attachmentsService.uploadToS3(
      pdfBuffer,
      `policies-bundle-${organizationId}-${timestamp}.pdf`,
      'application/pdf',
      organizationId,
      'policy_downloads',
      organizationId,
    );

    const downloadUrl =
      await this.attachmentsService.getPresignedDownloadUrl(key);

    this.logger.log(
      `Generated PDF bundle for organization ${organizationId} with ${policies.length} policies`,
    );

    return {
      name: `${organizationName} - All Policies`,
      downloadUrl,
      policyCount: policies.length,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
