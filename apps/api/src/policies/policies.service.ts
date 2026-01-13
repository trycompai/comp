import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db } from '@trycompai/db';
import type { Prisma } from '@trycompai/db';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { AttachmentsService } from '../attachments/attachments.service';
import { PolicyPdfRendererService } from '../trust-portal/policy-pdf-renderer.service';
import type { CreatePolicyDto } from './dto/create-policy.dto';
import type { UpdatePolicyDto } from './dto/update-policy.dto';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly pdfRendererService: PolicyPdfRendererService,
  ) {}

  async findAll(organizationId: string) {
    try {
      const policies = await db.policy.findMany({
        where: { organizationId },
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
      const policy = await db.policy.create({
        data: {
          ...createData,
          // Ensure JSON[] type compatibility for Prisma
          content: createData.content as Prisma.InputJsonValue[],
          organizationId,
          status: createData.status || 'draft',
          isRequiredToSign: createData.isRequiredToSign ?? true,
        },
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
      const policy = await db.policy.findFirst({
        where: {
          id,
          organizationId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!policy) {
        throw new NotFoundException(`Policy with ID ${id} not found`);
      }

      // Delete the policy
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

    // Get all published policies
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

    const preparePolicy = async (
      policy: (typeof policies)[0],
    ): Promise<PreparedPolicy> => {
      const hasUploadedPdf = policy.pdfUrl && policy.pdfUrl.trim() !== '';

      if (hasUploadedPdf) {
        try {
          const pdfBuffer = await this.attachmentsService.getObjectBuffer(
            policy.pdfUrl!,
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
        [{ name: policy.name, content: policy.content }],
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
      const renderedBuffer = this.pdfRendererService.renderPoliciesPdfBuffer(
        [{ name: policy.name, content: policy.content }],
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
          const embeddedFirstPage = await mergedPdf.embedPage(originalFirstPage);
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
}
