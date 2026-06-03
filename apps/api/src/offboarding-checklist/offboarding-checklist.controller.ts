import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { db } from '@db';
import type { Response } from 'express';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { UploadAttachmentDto } from '../attachments/upload-attachment.dto';
import { OffboardingChecklistService } from './offboarding-checklist.service';
import { OffboardingExportService } from './offboarding-export.service';
import { CreateTemplateItemDto } from './dto/create-template-item.dto';
import { UpdateTemplateItemDto } from './dto/update-template-item.dto';
import { CompleteChecklistItemDto } from './dto/complete-checklist-item.dto';

@ApiTags('Offboarding Checklist')
@Controller({ path: 'offboarding-checklist', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class OffboardingChecklistController {
  constructor(
    private readonly offboardingChecklistService: OffboardingChecklistService,
    private readonly offboardingExportService: OffboardingExportService,
  ) {}

  private requireUserId(authContext: AuthContextType): string {
    if (!authContext.userId) {
      throw new BadRequestException('User context required');
    }
    return authContext.userId;
  }

  @Get('pending')
  @RequirePermission('member', 'read')
  @ApiOperation({
    summary: 'Get members with pending offboarding checklists',
    description:
      'Lists members whose offboarding checklist is still incomplete, with their outstanding items, so you can track and finish departing-employee offboarding.',
  })
  async getPendingOffboardings(
    @OrganizationId() organizationId: string,
  ) {
    return this.offboardingChecklistService.getPendingOffboardings(
      organizationId,
    );
  }

  @Get('template')
  @RequirePermission('member', 'read')
  @ApiOperation({
    summary: 'Get the offboarding checklist template',
    description:
      "Returns the organization's offboarding checklist template: the ordered set of items every departing member must complete during their offboarding.",
  })
  async getTemplate(@OrganizationId() organizationId: string) {
    return this.offboardingChecklistService.getTemplate(organizationId);
  }

  @Post('template')
  @RequirePermission('member', 'update')
  @ApiOperation({
    summary: 'Add an offboarding checklist template item',
    description:
      "Creates a new item in the organization's offboarding checklist template so it appears on every member's offboarding checklist from now on.",
  })
  async createTemplateItem(
    @OrganizationId() organizationId: string,
    @Body() dto: CreateTemplateItemDto,
  ) {
    return this.offboardingChecklistService.createTemplateItem(
      organizationId,
      dto,
    );
  }

  @Patch('template/:id')
  @RequirePermission('member', 'update')
  @ApiOperation({
    summary: 'Update an offboarding checklist template item',
    description:
      "Updates an existing offboarding checklist template item by id, changing its label, description, or settings on the organization's offboarding template.",
  })
  async updateTemplateItem(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateItemDto,
  ) {
    return this.offboardingChecklistService.updateTemplateItem(
      organizationId,
      id,
      dto,
    );
  }

  @Delete('template/:id')
  @RequirePermission('member', 'update')
  @ApiOperation({
    summary: 'Delete an offboarding checklist template item',
    description:
      "Removes an item from the organization's offboarding checklist template by id so it no longer appears on members' offboarding checklists.",
  })
  async deleteTemplateItem(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.offboardingChecklistService.deleteTemplateItem(
      organizationId,
      id,
    );
  }

  @Get('member/:memberId')
  @RequirePermission('member', 'read')
  @ApiOperation({
    summary: "Get a member's offboarding checklist",
    description:
      'Returns the offboarding checklist for a specific member, including each item and whether it has been completed, to track that person\'s offboarding progress.',
  })
  async getMemberChecklist(
    @OrganizationId() organizationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.offboardingChecklistService.getMemberChecklist(
      organizationId,
      memberId,
    );
  }

  @Get('export-all')
  @RequirePermission('member', 'read')
  @ApiOperation({
    summary: 'Export all offboarding evidence as a zip file',
    description:
      'Exports a zip archive containing the offboarding checklist evidence for every member in the organization, for audits, handovers, or record-keeping.',
  })
  async exportAllEvidence(
    @OrganizationId() organizationId: string,
    @Res() res: Response,
  ) {
    const org = await db.organization.findFirst({
      where: { id: organizationId },
      select: { name: true },
    });
    const safeOrgName = (org?.name ?? 'org').replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${safeOrgName}-offboardings-${date}.zip"`,
    });
    await this.offboardingExportService.exportAllOffboardings({
      organizationId,
      output: res,
    });
  }

  @Get('member/:memberId/export')
  @RequirePermission('member', 'read')
  @ApiOperation({
    summary: 'Export offboarding evidence as a zip file',
    description:
      'Exports a zip archive of the offboarding checklist evidence collected for a single member, for audit, handover, or record-keeping purposes.',
  })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  async exportEvidence(
    @Param('memberId') memberId: string,
    @OrganizationId() organizationId: string,
    @Res() res: Response,
  ) {
    const member = await db.member.findFirst({
      where: { id: memberId, organizationId },
      include: { user: { select: { name: true } } },
    });

    const safeName = (member?.user.name ?? 'member').replace(
      /[^a-zA-Z0-9]/g,
      '-',
    );
    const date = new Date().toISOString().split('T')[0];

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="offboarding-${safeName}-${date}.zip"`,
    });

    await this.offboardingExportService.exportMemberEvidence({
      organizationId,
      memberId,
      output: res,
    });
  }

  @Post('member/:memberId/item/:templateItemId/complete')
  @RequirePermission('member', 'update')
  @ApiOperation({
    summary: 'Complete an offboarding checklist item',
    description:
      "Marks a specific offboarding checklist item complete for a member, recording who completed it and when, as part of finishing that member's offboarding.",
  })
  async completeItem(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('memberId') memberId: string,
    @Param('templateItemId') templateItemId: string,
    @Body() dto: CompleteChecklistItemDto,
  ) {
    return this.offboardingChecklistService.completeItem({
      organizationId,
      memberId,
      templateItemId,
      completedById: this.requireUserId(authContext),
      dto,
    });
  }

  @Delete('member/:memberId/item/:templateItemId/complete')
  @RequirePermission('member', 'update')
  @ApiOperation({
    summary: 'Reopen an offboarding checklist item',
    description:
      'Reverts a previously completed offboarding checklist item back to incomplete for a member, in case the step was marked done by mistake.',
  })
  async uncompleteItem(
    @OrganizationId() organizationId: string,
    @Param('memberId') memberId: string,
    @Param('templateItemId') templateItemId: string,
  ) {
    return this.offboardingChecklistService.uncompleteItem({
      organizationId,
      memberId,
      templateItemId,
    });
  }

  @Post('member/:memberId/item/:templateItemId/evidence')
  @RequirePermission('member', 'update')
  @ApiOperation({
    summary: 'Upload evidence for an offboarding checklist item',
    description:
      "Attaches a supporting evidence file to a member's completed offboarding checklist item, documenting that the offboarding step was actually carried out.",
  })
  async uploadEvidence(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Param('memberId') memberId: string,
    @Param('templateItemId') templateItemId: string,
    @Body() uploadDto: UploadAttachmentDto,
  ) {
    return this.offboardingChecklistService.uploadEvidenceToCompletion({
      organizationId,
      memberId,
      templateItemId,
      uploadDto,
      userId: this.requireUserId(authContext),
    });
  }

  @Get('member/:memberId/access-revocations')
  @RequirePermission('member', 'read')
  @ApiOperation({
    summary: 'Get vendor access revocation status for a member',
    description:
      'Lists the vendors a departing member had access to and whether each has been revoked, so you can confirm all vendor access is removed during offboarding.',
  })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  async getAccessRevocations(
    @OrganizationId() organizationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.offboardingChecklistService.getAccessRevocations(
      organizationId,
      memberId,
    );
  }

  @Post('member/:memberId/access-revocations/confirm-all')
  @RequirePermission('member', 'update')
  @ApiOperation({
    summary: 'Confirm all vendor access as revoked',
    description:
      "Marks every vendor access record for a departing member as revoked in one step, recording who confirmed it, to complete access removal during offboarding.",
  })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  async revokeAllVendorAccess(
    @OrganizationId() organizationId: string,
    @Param('memberId') memberId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    return this.offboardingChecklistService.revokeAllVendorAccess({
      organizationId,
      memberId,
      revokedById: this.requireUserId(authContext),
    });
  }

  @Post('member/:memberId/access-revocations/:vendorId')
  @RequirePermission('member', 'update')
  @ApiOperation({
    summary: 'Mark vendor access as revoked',
    description:
      "Marks a single vendor's access for a departing member as revoked, optionally attaching evidence and notes, as part of offboarding access removal.",
  })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  async revokeVendorAccess(
    @OrganizationId() organizationId: string,
    @Param('memberId') memberId: string,
    @Param('vendorId') vendorId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() body: { notes?: string; fileName?: string; fileType?: string; fileData?: string },
  ) {
    const evidenceFields = [body?.fileName, body?.fileType, body?.fileData];
    const providedCount = evidenceFields.filter(Boolean).length;
    if (providedCount > 0 && providedCount < 3) {
      throw new BadRequestException('fileName, fileType, and fileData must all be provided together');
    }
    const evidence = body?.fileName && body?.fileType && body?.fileData
      ? { fileName: body.fileName, fileType: body.fileType, fileData: body.fileData }
      : undefined;
    return this.offboardingChecklistService.revokeVendorAccess({
      organizationId,
      memberId,
      vendorId,
      revokedById: this.requireUserId(authContext),
      notes: body?.notes,
      evidence,
    });
  }

  @Delete('member/:memberId/access-revocations/:vendorId')
  @RequirePermission('member', 'update')
  @ApiOperation({
    summary: 'Undo vendor access revocation',
    description:
      "Reverses a vendor access revocation for a member, marking that vendor's access as not revoked again, in case it was confirmed by mistake during offboarding.",
  })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  async undoVendorRevocation(
    @OrganizationId() organizationId: string,
    @Param('memberId') memberId: string,
    @Param('vendorId') vendorId: string,
  ) {
    return this.offboardingChecklistService.undoVendorRevocation({
      organizationId,
      memberId,
      vendorId,
    });
  }

}
