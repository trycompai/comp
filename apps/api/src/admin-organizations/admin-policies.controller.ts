import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { db } from '@db';
import {
  PolicyStatus,
  Frequency,
  Departments,
} from '../policies/dto/create-policy.dto';
import { auth as triggerAuth, tasks } from '@trigger.dev/sdk';
import type { updatePolicy } from '../trigger/policies/update-policy';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { PoliciesService } from '../policies/policies.service';
import { AdminAuditLogInterceptor } from './admin-audit-log.interceptor';
import { CreateAdminPolicyDto } from './dto/create-admin-policy.dto';

interface UpdatePolicyBody {
  status?: string;
  department?: string;
  frequency?: string | null;
}

@ApiTags('Admin - Policies')
@Controller({ path: 'admin/organizations', version: '1' })
@UseGuards(PlatformAdminGuard)
@UseInterceptors(AdminAuditLogInterceptor)
@Throttle({ default: { ttl: 60000, limit: 30 } })
export class AdminPoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get(':orgId/policies')
  @ApiOperation({ summary: 'List all policies for an organization (admin)' })
  async list(@Param('orgId') orgId: string) {
    return this.policiesService.findAll(orgId);
  }

  @Post(':orgId/policies')
  @ApiOperation({ summary: 'Create a policy for an organization (admin)' })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async create(
    @Param('orgId') orgId: string,
    @Body() createDto: CreateAdminPolicyDto,
  ) {
    return this.policiesService.create(orgId, {
      name: createDto.name,
      content: [],
      description: createDto.description,
      status: createDto.status,
      frequency: createDto.frequency,
      department: createDto.department,
    });
  }

  @Patch(':orgId/policies/:policyId')
  @ApiOperation({ summary: 'Update a policy for an organization (admin)' })
  async update(
    @Param('orgId') orgId: string,
    @Param('policyId') policyId: string,
    @Body() body: UpdatePolicyBody,
  ) {
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!Object.values(PolicyStatus).includes(body.status as PolicyStatus)) {
        throw new BadRequestException(
          `Invalid status. Must be one of: ${Object.values(PolicyStatus).join(', ')}`,
        );
      }
      updateData.status = body.status as PolicyStatus;
    }

    if (body.department !== undefined) {
      if (
        !Object.values(Departments).includes(body.department as Departments)
      ) {
        throw new BadRequestException(
          `Invalid department. Must be one of: ${Object.values(Departments).join(', ')}`,
        );
      }
      updateData.department = body.department as Departments;
    }

    if (body.frequency !== undefined) {
      if (
        body.frequency !== null &&
        !Object.values(Frequency).includes(body.frequency as Frequency)
      ) {
        throw new BadRequestException(
          `Invalid frequency. Must be one of: ${Object.values(Frequency).join(', ')}`,
        );
      }
      updateData.frequency =
        body.frequency === null ? null : (body.frequency as Frequency);
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException(
        'At least one field (status, department, frequency) is required',
      );
    }

    return this.policiesService.updateById(policyId, orgId, updateData);
  }

  @Post(':orgId/policies/:policyId/regenerate')
  @ApiOperation({ summary: 'Regenerate policy content using AI (admin)' })
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  async regenerate(
    @Param('orgId') orgId: string,
    @Param('policyId') policyId: string,
  ) {
    const instances = await db.frameworkInstance.findMany({
      where: { organizationId: orgId },
      include: { framework: true },
    });

    const uniqueFrameworks = Array.from(
      new Map(instances.map((fi) => [fi.framework.id, fi.framework])).values(),
    ).map((f) => ({
      id: f.id,
      name: f.name,
      version: f.version,
      description: f.description,
      visible: f.visible,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    const contextEntries = await db.context.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
    });
    const contextHub = contextEntries
      .map((c) => `${c.question}\n${c.answer}`)
      .join('\n');

    const handle = await tasks.trigger<typeof updatePolicy>('update-policy', {
      organizationId: orgId,
      policyId,
      contextHub,
      frameworks: uniqueFrameworks,
      memberId: undefined,
    });

    const publicAccessToken = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [handle.id] } },
    });

    return { data: { runId: handle.id, publicAccessToken } };
  }
}
