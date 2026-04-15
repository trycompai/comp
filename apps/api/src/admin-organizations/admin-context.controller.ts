import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { ContextService } from '../context/context.service';
import { CreateContextDto } from '../context/dto/create-context.dto';
import { UpdateContextDto } from '../context/dto/update-context.dto';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';

@ApiTags('Admin - Context')
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 30 } })
export class AdminContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get(':orgId/context')
  @ApiOperation({ summary: 'List context entries for an organization (admin)' })
  async list(
    @Param('orgId') orgId: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.contextService.findAllByOrganization(orgId, {
      search,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Post(':orgId/context')
  @ApiOperation({
    summary: 'Create a context entry for an organization (admin)',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async create(
    @Param('orgId') orgId: string,
    @Body() createDto: CreateContextDto,
  ) {
    return this.contextService.create(orgId, createDto);
  }

  @Patch(':orgId/context/:contextId')
  @ApiOperation({
    summary: 'Update a context entry for an organization (admin)',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async update(
    @Param('orgId') orgId: string,
    @Param('contextId') contextId: string,
    @Body() updateDto: UpdateContextDto,
  ) {
    return this.contextService.updateById(contextId, orgId, updateDto);
  }
}
