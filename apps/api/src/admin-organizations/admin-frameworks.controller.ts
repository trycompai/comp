import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { FrameworksService } from '../frameworks/frameworks.service';
import { AddFrameworksDto } from '../frameworks/dto/add-frameworks.dto';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';

@ApiExcludeController()
@ApiTags('Admin - Frameworks')
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 30 } })
export class AdminFrameworksController {
  constructor(private readonly frameworksService: FrameworksService) {}

  @Get(':orgId/frameworks')
  @ApiOperation({ summary: 'List frameworks for an organization (admin)' })
  async list(@Param('orgId') orgId: string) {
    const [frameworks, availableFrameworks] = await Promise.all([
      this.frameworksService.findAll(orgId),
      this.frameworksService.findAvailable(orgId),
    ]);

    const activeFrameworkIds = new Set(
      frameworks
        .map(
          (framework) =>
            framework.framework?.id ?? framework.customFramework?.id,
        )
        .filter((id): id is string => Boolean(id)),
    );

    return {
      frameworks,
      availableFrameworks: availableFrameworks.filter(
        (framework) =>
          framework.isCustom === false && !activeFrameworkIds.has(framework.id),
      ),
    };
  }

  @Post(':orgId/frameworks')
  @ApiOperation({ summary: 'Add frameworks to an organization (admin)' })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async addFrameworks(
    @Param('orgId') orgId: string,
    @Body() dto: AddFrameworksDto,
  ) {
    return this.frameworksService.addFrameworks(orgId, dto.frameworkIds);
  }

  @Delete(':orgId/frameworks/:frameworkInstanceId')
  @ApiOperation({ summary: 'Remove a framework from an organization (admin)' })
  async deleteFramework(
    @Param('orgId') orgId: string,
    @Param('frameworkInstanceId') frameworkInstanceId: string,
  ) {
    return this.frameworksService.delete(frameworkInstanceId, orgId);
  }
}
