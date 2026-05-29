import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationId } from '@/auth/auth-context.decorator';
import { HybridAuthGuard } from '@/auth/hybrid-auth.guard';
import { PermissionGuard } from '../../auth/permission.guard';
import { RequirePermission } from '../../auth/require-permission.decorator';
import { IsmsProfileService } from './isms-profile.service';
import { GenerateAllDto } from './dto/generate-all.dto';
import { saveWizardProfileSchema } from './wizard-schema';

/**
 * ISMS wizard profile endpoints (CS-438). The profile holds the ~12 un-derivable
 * wizard answers (IsmsProfile.answers) that feed document generation. Shares the
 * `isms` controller path and the evidence:read / evidence:update gating used by
 * the rest of the ISMS module.
 */
@ApiTags('ISMS')
@Controller({ path: 'isms', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class IsmsProfileController {
  constructor(private readonly profileService: IsmsProfileService) {}

  @Get('profile')
  @RequirePermission('evidence', 'read')
  @ApiOperation({ summary: 'Get the ISMS wizard profile, defaults and members' })
  @ApiOkResponse({ description: 'Wizard profile, defaults and member options' })
  async getProfile(
    @Query('frameworkId') frameworkId: string,
    @OrganizationId() organizationId: string,
  ) {
    if (!frameworkId) {
      throw new BadRequestException('frameworkId is required');
    }
    return this.profileService.getProfile({ organizationId, frameworkId });
  }

  @Post('profile')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Save (partial) ISMS wizard answers' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Saved profile' })
  async saveProfile(
    // Read req.body directly: ValidationPipe with transform mangles the nested
    // answers JSON. We validate with the shared Zod schema instead.
    @Req() req: Request,
    @OrganizationId() organizationId: string,
  ) {
    const parsed = saveWizardProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const { frameworkId, answers, complete } = parsed.data;

    return this.profileService.saveProfile({
      organizationId,
      frameworkId,
      answers,
      complete: complete ?? false,
    });
  }

  @Post('generate-all')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('evidence', 'update')
  @ApiOperation({ summary: 'Ensure and regenerate all ISMS documents' })
  @ApiConsumes('application/json')
  @ApiOkResponse({ description: 'Regenerated ISMS documents' })
  async generateAll(
    @Body() dto: GenerateAllDto,
    @OrganizationId() organizationId: string,
  ) {
    return this.profileService.generateAll({
      organizationId,
      frameworkId: dto.frameworkId,
    });
  }
}
