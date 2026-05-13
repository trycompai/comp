import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { UploadAttachmentDto } from '../attachments/upload-attachment.dto';
import { OffboardingChecklistService } from './offboarding-checklist.service';
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
  ) {}

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
}
