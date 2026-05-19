import {
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

  @Get('pending')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Get members with pending offboarding checklists' })
  async getPendingOffboardings(
    @OrganizationId() organizationId: string,
  ) {
    return this.offboardingChecklistService.getPendingOffboardings(
      organizationId,
    );
  }

  @Get('template')
  @RequirePermission('member', 'read')
  async getTemplate(@OrganizationId() organizationId: string) {
    return this.offboardingChecklistService.getTemplate(organizationId);
  }

  @Post('template')
  @RequirePermission('member', 'update')
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
  async getMemberChecklist(
    @OrganizationId() organizationId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.offboardingChecklistService.getMemberChecklist(
      organizationId,
      memberId,
    );
  }

  @Get('member/:memberId/export')
  @RequirePermission('member', 'read')
  @ApiOperation({ summary: 'Export offboarding evidence as a zip file' })
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
      completedById: authContext.userId!,
      dto,
    });
  }

  @Delete('member/:memberId/item/:templateItemId/complete')
  @RequirePermission('member', 'update')
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
      userId: authContext.userId!,
    });
  }

  @Get('member/:memberId/access-revocations')
  @RequirePermission('member', 'read')
  @ApiOperation({
    summary: 'Get vendor access revocation status for a member',
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
  @ApiOperation({ summary: 'Confirm all vendor access as revoked' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  async revokeAllVendorAccess(
    @OrganizationId() organizationId: string,
    @Param('memberId') memberId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    return this.offboardingChecklistService.revokeAllVendorAccess({
      organizationId,
      memberId,
      revokedById: authContext.userId!,
    });
  }

  @Post('member/:memberId/access-revocations/:vendorId')
  @RequirePermission('member', 'update')
  @ApiOperation({ summary: 'Mark vendor access as revoked' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiParam({ name: 'vendorId', description: 'Vendor ID' })
  async revokeVendorAccess(
    @OrganizationId() organizationId: string,
    @Param('memberId') memberId: string,
    @Param('vendorId') vendorId: string,
    @AuthContext() authContext: AuthContextType,
    @Body() body: { notes?: string; fileName?: string; fileType?: string; fileData?: string },
  ) {
    const evidence = body?.fileName && body?.fileType && body?.fileData
      ? { fileName: body.fileName, fileType: body.fileType, fileData: body.fileData }
      : undefined;
    return this.offboardingChecklistService.revokeVendorAccess({
      organizationId,
      memberId,
      vendorId,
      revokedById: authContext.userId!,
      notes: body?.notes,
      evidence,
    });
  }

  @Delete('member/:memberId/access-revocations/:vendorId')
  @RequirePermission('member', 'update')
  @ApiOperation({ summary: 'Undo vendor access revocation' })
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
