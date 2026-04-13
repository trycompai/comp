import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
  ApiExtraModels,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { db } from '@db';
import { auth as triggerAuth, tasks } from '@trigger.dev/sdk';
import type { updatePolicy } from '../trigger/policies/update-policy';
import { AuditRead } from '../audit/skip-audit-log.decorator';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { CreatePolicyDto } from './dto/create-policy.dto';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { AISuggestPolicyRequestDto } from './dto/ai-suggest-policy.dto';
import {
  CreateVersionDto,
  PublishVersionDto,
  SubmitForApprovalDto,
  UpdateVersionContentDto,
} from './dto/version.dto';
import { PoliciesService } from './policies.service';
import { GET_ALL_POLICIES_RESPONSES } from './schemas/get-all-policies.responses';
import { GET_POLICY_BY_ID_RESPONSES } from './schemas/get-policy-by-id.responses';
import { CREATE_POLICY_RESPONSES } from './schemas/create-policy.responses';
import { UPDATE_POLICY_RESPONSES } from './schemas/update-policy.responses';
import { DELETE_POLICY_RESPONSES } from './schemas/delete-policy.responses';
import { POLICY_OPERATIONS } from './schemas/policy-operations';
import { POLICY_PARAMS } from './schemas/policy-params';
import { POLICY_BODIES } from './schemas/policy-bodies';
import { VERSION_OPERATIONS } from './schemas/version-operations';
import { VERSION_PARAMS } from './schemas/version-params';
import { VERSION_BODIES } from './schemas/version-bodies';
import {
  CREATE_POLICY_VERSION_RESPONSES,
  DELETE_VERSION_RESPONSES,
  GET_POLICY_VERSION_BY_ID_RESPONSES,
  GET_POLICY_VERSIONS_RESPONSES,
  PUBLISH_VERSION_RESPONSES,
  SET_ACTIVE_VERSION_RESPONSES,
  SUBMIT_VERSION_FOR_APPROVAL_RESPONSES,
  UPDATE_VERSION_CONTENT_RESPONSES,
} from './schemas/version-responses';
import { PolicyResponseDto } from './dto/policy-responses.dto';

@ApiTags('Policies')
@ApiExtraModels(PolicyResponseDto)
@Controller({ path: 'policies', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  @RequirePermission('policy', 'read')
  @ApiOperation(POLICY_OPERATIONS.getAllPolicies)
  @ApiResponse(GET_ALL_POLICIES_RESPONSES[200])
  @ApiResponse(GET_ALL_POLICIES_RESPONSES[401])
  async getAllPolicies(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const policies = await this.policiesService.findAll(organizationId);

    return {
      data: policies,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post('publish-all')
  @RequirePermission('policy', 'update')
  @ApiOperation({ summary: 'Publish all draft policies' })
  async publishAllPolicies(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.publishAll(
      organizationId,
      authContext.userId,
      authContext.memberId,
    );

    return {
      ...data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Get('download-all')
  @RequirePermission('policy', 'read')
  @AuditRead()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Download all published policies as a single PDF',
    description:
      'Generates a PDF bundle containing all published policies with organization branding and returns a signed download URL',
  })
  @ApiResponse({
    status: 200,
    description: 'Signed URL for PDF bundle returned',
  })
  @ApiResponse({
    status: 404,
    description: 'No published policies found',
  })
  async downloadAllPolicies(
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result =
      await this.policiesService.downloadAllPoliciesPdf(organizationId);

    return {
      ...result,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Get(':id/controls')
  @RequirePermission('policy', 'read')
  @ApiOperation({ summary: 'Get mapped and all controls for a policy' })
  @ApiParam(POLICY_PARAMS.policyId)
  async getPolicyControls(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const [policy, allControls] = await Promise.all([
      db.policy.findFirst({
        where: { id, organizationId },
        select: {
          id: true,
          controls: { select: { id: true, name: true, description: true } },
        },
      }),
      db.control.findMany({
        where: { organizationId },
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return {
      mappedControls: policy?.controls ?? [],
      allControls,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/regenerate')
  @RequirePermission('policy', 'update')
  @ApiOperation({ summary: 'Regenerate policy content using AI' })
  @ApiParam(POLICY_PARAMS.policyId)
  async regeneratePolicy(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const member = authContext.userId
      ? await db.member.findFirst({
          where: { organizationId, userId: authContext.userId },
          select: { id: true },
        })
      : null;

    const instances = await db.frameworkInstance.findMany({
      where: { organizationId },
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
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
    });
    const contextHub = contextEntries.map((c) => `${c.question}\n${c.answer}`).join('\n');

    const handle = await tasks.trigger<typeof updatePolicy>('update-policy', {
      organizationId,
      policyId: id,
      contextHub,
      frameworks: uniqueFrameworks,
      memberId: member?.id,
    });

    const publicAccessToken = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [handle.id] } },
    });

    return {
      data: { runId: handle.id, publicAccessToken },
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Get(':id/pdf/signed-url')
  @RequirePermission('policy', 'read')
  @AuditRead()
  @ApiOperation({ summary: 'Get a signed URL for the policy PDF' })
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiQuery({ name: 'versionId', required: false })
  async getPdfSignedUrl(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Query('versionId') versionId?: string,
  ) {
    // Find the PDF URL from version or policy
    let pdfUrl: string | null = null;

    if (versionId) {
      const version = await db.policyVersion.findFirst({
        where: { id: versionId, policy: { id, organizationId } },
        select: { pdfUrl: true },
      });
      pdfUrl = version?.pdfUrl ?? null;
    }

    if (!pdfUrl) {
      const policy = await db.policy.findFirst({
        where: { id, organizationId },
        select: { pdfUrl: true },
      });
      pdfUrl = policy?.pdfUrl ?? null;
    }

    if (!pdfUrl) {
      return {
        url: null,
        authType: authContext.authType,
        ...(authContext.userId && {
          authenticatedUser: {
            id: authContext.userId,
            email: authContext.userEmail,
          },
        }),
      };
    }

    // Generate signed URL
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('../app/s3');
    const bucketName = process.env.APP_AWS_BUCKET_NAME;

    if (!bucketName) {
      return { url: null };
    }

    const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const command = new GetObjectCommand({ Bucket: bucketName, Key: pdfUrl });
    const url = await getSignedUrl(s3, command, { expiresIn: 900 });

    return {
      url,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/pdf')
  @RequirePermission('policy', 'update')
  @ApiOperation({ summary: 'Upload a PDF to a policy or version' })
  @ApiParam(POLICY_PARAMS.policyId)
  async uploadPolicyPdf(
    @Param('id') id: string,
    @Body() body: { versionId?: string; fileName: string; fileType: string; fileData: string },
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const bucketName = process.env.APP_AWS_BUCKET_NAME;
    if (!bucketName) throw new BadRequestException('File storage is not configured');

    const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

    const policy = await db.policy.findFirst({
      where: { id, organizationId },
      select: { id: true, status: true, pdfUrl: true, currentVersionId: true, pendingVersionId: true },
    });
    if (!policy) throw new NotFoundException('Policy not found');

    const sanitizedFileName = body.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileBuffer = Buffer.from(body.fileData, 'base64');

    if (body.versionId) {
      const version = await db.policyVersion.findFirst({
        where: { id: body.versionId, policyId: id },
        select: { id: true, pdfUrl: true, version: true },
      });
      if (!version) throw new NotFoundException('Version not found');
      if (version.id === policy.currentVersionId && policy.status !== 'draft') {
        throw new BadRequestException('Cannot upload PDF to the published version');
      }
      if (version.id === policy.pendingVersionId) {
        throw new BadRequestException('Cannot upload PDF to a version pending approval');
      }

      const s3Key = `${organizationId}/policies/${id}/v${version.version}-${Date.now()}-${sanitizedFileName}`;
      await s3.send(new PutObjectCommand({ Bucket: bucketName, Key: s3Key, Body: fileBuffer, ContentType: body.fileType }));
      const oldPdfUrl = version.pdfUrl;
      await db.policyVersion.update({ where: { id: body.versionId }, data: { pdfUrl: s3Key } });

      if (oldPdfUrl && oldPdfUrl !== s3Key) {
        try { await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: oldPdfUrl })); } catch { /* ignore */ }
      }

      return { data: { s3Key }, authType: authContext.authType };
    }

    // Legacy: upload to policy level
    const s3Key = `${organizationId}/policies/${id}/${Date.now()}-${sanitizedFileName}`;
    await s3.send(new PutObjectCommand({ Bucket: bucketName, Key: s3Key, Body: fileBuffer, ContentType: body.fileType }));
    const oldPdfUrl = policy.pdfUrl;
    await db.policy.update({ where: { id }, data: { pdfUrl: s3Key, displayFormat: 'PDF' } });

    if (oldPdfUrl && oldPdfUrl !== s3Key) {
      try { await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: oldPdfUrl })); } catch { /* ignore */ }
    }

    return { data: { s3Key }, authType: authContext.authType };
  }

  @Delete(':id/pdf')
  @RequirePermission('policy', 'update')
  @ApiOperation({ summary: 'Delete a policy PDF' })
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiQuery({ name: 'versionId', required: false })
  async deletePolicyPdf(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Query('versionId') versionId?: string,
  ) {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const bucketName = process.env.APP_AWS_BUCKET_NAME;
    if (!bucketName) throw new BadRequestException('File storage is not configured');

    const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

    if (versionId) {
      const version = await db.policyVersion.findFirst({
        where: { id: versionId, policy: { id, organizationId } },
        select: { id: true, pdfUrl: true },
      });
      if (!version) throw new NotFoundException('Version not found');
      if (version.pdfUrl) {
        try { await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: version.pdfUrl })); } catch { /* ignore */ }
        await db.policyVersion.update({ where: { id: versionId }, data: { pdfUrl: null } });
      }
    } else {
      const policy = await db.policy.findFirst({
        where: { id, organizationId },
        select: { id: true, pdfUrl: true },
      });
      if (!policy) throw new NotFoundException('Policy not found');
      if (policy.pdfUrl) {
        try { await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: policy.pdfUrl })); } catch { /* ignore */ }
        await db.policy.update({ where: { id }, data: { pdfUrl: null } });
      }
    }

    return {
      success: true,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: { id: authContext.userId, email: authContext.userEmail },
      }),
    };
  }

  @Get(':id/pdf-url')
  @RequirePermission('policy', 'read')
  @ApiOperation({ summary: 'Get signed URL for policy PDF (alternate path)' })
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiQuery({ name: 'versionId', required: false })
  async getPdfUrl(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
    @Query('versionId') versionId?: string,
  ) {
    let pdfUrl: string | null = null;

    if (versionId) {
      const version = await db.policyVersion.findFirst({
        where: { id: versionId, policy: { id, organizationId } },
        select: { pdfUrl: true },
      });
      pdfUrl = version?.pdfUrl ?? null;
    }
    if (!pdfUrl) {
      const policy = await db.policy.findFirst({
        where: { id, organizationId },
        select: { pdfUrl: true },
      });
      pdfUrl = policy?.pdfUrl ?? null;
    }
    if (!pdfUrl) return { url: null };

    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('../app/s3');
    const bucketName = process.env.APP_AWS_BUCKET_NAME;
    if (!bucketName) return { url: null };

    const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucketName, Key: pdfUrl }), { expiresIn: 900 });

    return { url };
  }

  @Post(':id/controls')
  @RequirePermission('policy', 'update')
  @ApiOperation({ summary: 'Map controls to a policy' })
  @ApiParam(POLICY_PARAMS.policyId)
  async addPolicyControls(
    @Param('id') id: string,
    @Body() body: { controlIds: string[] },
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    await db.policy.update({
      where: { id, organizationId },
      data: {
        controls: {
          connect: body.controlIds.map((cid) => ({ id: cid })),
        },
      },
    });

    return {
      success: true,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Delete(':id/controls/:controlId')
  @RequirePermission('policy', 'update')
  @ApiOperation({ summary: 'Remove a control mapping from a policy' })
  @ApiParam(POLICY_PARAMS.policyId)
  async removePolicyControl(
    @Param('id') id: string,
    @Param('controlId') controlId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    await db.policy.update({
      where: { id, organizationId },
      data: {
        controls: {
          disconnect: { id: controlId },
        },
      },
    });

    return {
      success: true,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Get(':id')
  @RequirePermission('policy', 'read')
  @ApiOperation(POLICY_OPERATIONS.getPolicyById)
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiResponse(GET_POLICY_BY_ID_RESPONSES[200])
  @ApiResponse(GET_POLICY_BY_ID_RESPONSES[401])
  @ApiResponse(GET_POLICY_BY_ID_RESPONSES[404])
  async getPolicy(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const policy = await this.policiesService.findById(id, organizationId);

    return {
      ...policy,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post()
  @RequirePermission('policy', 'create')
  @ApiOperation(POLICY_OPERATIONS.createPolicy)
  @ApiBody(POLICY_BODIES.createPolicy)
  @ApiResponse(CREATE_POLICY_RESPONSES[201])
  @ApiResponse(CREATE_POLICY_RESPONSES[400])
  @ApiResponse(CREATE_POLICY_RESPONSES[401])
  async createPolicy(
    @Body() createData: CreatePolicyDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const policy = await this.policiesService.create(
      organizationId,
      createData,
    );

    return {
      ...policy,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Patch(':id')
  @RequirePermission('policy', 'update')
  @ApiOperation(POLICY_OPERATIONS.updatePolicy)
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiBody(POLICY_BODIES.updatePolicy)
  @ApiResponse(UPDATE_POLICY_RESPONSES[200])
  @ApiResponse(UPDATE_POLICY_RESPONSES[400])
  @ApiResponse(UPDATE_POLICY_RESPONSES[401])
  @ApiResponse(UPDATE_POLICY_RESPONSES[404])
  async updatePolicy(
    @Param('id') id: string,
    @Body() updateData: UpdatePolicyDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const updatedPolicy = await this.policiesService.updateById(
      id,
      organizationId,
      updateData,
    );

    return {
      ...updatedPolicy,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Delete(':id')
  @RequirePermission('policy', 'delete')
  @ApiOperation(POLICY_OPERATIONS.deletePolicy)
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiResponse(DELETE_POLICY_RESPONSES[200])
  @ApiResponse(DELETE_POLICY_RESPONSES[401])
  @ApiResponse(DELETE_POLICY_RESPONSES[404])
  async deletePolicy(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const result = await this.policiesService.deleteById(id, organizationId);

    return {
      ...result,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Get(':id/versions')
  @RequirePermission('policy', 'read')
  @ApiOperation(VERSION_OPERATIONS.getPolicyVersions)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiResponse(GET_POLICY_VERSIONS_RESPONSES[200])
  @ApiResponse(GET_POLICY_VERSIONS_RESPONSES[401])
  @ApiResponse(GET_POLICY_VERSIONS_RESPONSES[404])
  async getPolicyVersions(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.getVersions(id, organizationId);

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Get(':id/versions/:versionId')
  @RequirePermission('policy', 'read')
  @ApiOperation(VERSION_OPERATIONS.getPolicyVersionById)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiParam(VERSION_PARAMS.versionId)
  @ApiResponse(GET_POLICY_VERSION_BY_ID_RESPONSES[200])
  @ApiResponse(GET_POLICY_VERSION_BY_ID_RESPONSES[401])
  @ApiResponse(GET_POLICY_VERSION_BY_ID_RESPONSES[404])
  async getPolicyVersionById(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.getVersionById(
      id,
      versionId,
      organizationId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/versions')
  @RequirePermission('policy', 'update')
  @ApiOperation(VERSION_OPERATIONS.createPolicyVersion)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiBody(VERSION_BODIES.createVersion)
  @ApiResponse(CREATE_POLICY_VERSION_RESPONSES[201])
  @ApiResponse(CREATE_POLICY_VERSION_RESPONSES[400])
  @ApiResponse(CREATE_POLICY_VERSION_RESPONSES[401])
  @ApiResponse(CREATE_POLICY_VERSION_RESPONSES[404])
  async createPolicyVersion(
    @Param('id') id: string,
    @Body() body: CreateVersionDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.createVersion(
      id,
      organizationId,
      body,
      authContext.userId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Patch(':id/versions/:versionId')
  @RequirePermission('policy', 'update')
  @ApiOperation(VERSION_OPERATIONS.updateVersionContent)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiParam(VERSION_PARAMS.versionId)
  @ApiBody(VERSION_BODIES.updateVersionContent)
  @ApiResponse(UPDATE_VERSION_CONTENT_RESPONSES[200])
  @ApiResponse(UPDATE_VERSION_CONTENT_RESPONSES[400])
  @ApiResponse(UPDATE_VERSION_CONTENT_RESPONSES[401])
  @ApiResponse(UPDATE_VERSION_CONTENT_RESPONSES[404])
  async updateVersionContent(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Req() req: { body: { content?: unknown[] } },
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    // Use req.body directly to avoid class-transformer mangling TipTap JSON
    const data = await this.policiesService.updateVersionContent(
      id,
      versionId,
      organizationId,
      { content: req.body.content ?? [] },
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Delete(':id/versions/:versionId')
  @RequirePermission('policy', 'delete')
  @ApiOperation(VERSION_OPERATIONS.deletePolicyVersion)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiParam(VERSION_PARAMS.versionId)
  @ApiResponse(DELETE_VERSION_RESPONSES[200])
  @ApiResponse(DELETE_VERSION_RESPONSES[400])
  @ApiResponse(DELETE_VERSION_RESPONSES[401])
  @ApiResponse(DELETE_VERSION_RESPONSES[404])
  async deletePolicyVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.deleteVersion(
      id,
      versionId,
      organizationId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/versions/publish')
  @RequirePermission('policy', 'update')
  @ApiOperation(VERSION_OPERATIONS.publishPolicyVersion)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiBody(VERSION_BODIES.publishVersion)
  @ApiResponse(PUBLISH_VERSION_RESPONSES[200])
  @ApiResponse(PUBLISH_VERSION_RESPONSES[400])
  @ApiResponse(PUBLISH_VERSION_RESPONSES[401])
  @ApiResponse(PUBLISH_VERSION_RESPONSES[404])
  async publishPolicyVersion(
    @Param('id') id: string,
    @Body() body: PublishVersionDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.publishVersion(
      id,
      organizationId,
      body,
      authContext.userId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/versions/:versionId/activate')
  @RequirePermission('policy', 'update')
  @ApiOperation(VERSION_OPERATIONS.setActivePolicyVersion)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiParam(VERSION_PARAMS.versionId)
  @ApiResponse(SET_ACTIVE_VERSION_RESPONSES[200])
  @ApiResponse(SET_ACTIVE_VERSION_RESPONSES[400])
  @ApiResponse(SET_ACTIVE_VERSION_RESPONSES[401])
  @ApiResponse(SET_ACTIVE_VERSION_RESPONSES[404])
  async setActivePolicyVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.setActiveVersion(
      id,
      versionId,
      organizationId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/versions/:versionId/submit-for-approval')
  @RequirePermission('policy', 'update')
  @ApiOperation(VERSION_OPERATIONS.submitVersionForApproval)
  @ApiParam(VERSION_PARAMS.policyId)
  @ApiParam(VERSION_PARAMS.versionId)
  @ApiBody(VERSION_BODIES.submitForApproval)
  @ApiResponse(SUBMIT_VERSION_FOR_APPROVAL_RESPONSES[200])
  @ApiResponse(SUBMIT_VERSION_FOR_APPROVAL_RESPONSES[400])
  @ApiResponse(SUBMIT_VERSION_FOR_APPROVAL_RESPONSES[401])
  @ApiResponse(SUBMIT_VERSION_FOR_APPROVAL_RESPONSES[404])
  async submitVersionForApproval(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @Body() body: SubmitForApprovalDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.submitForApproval(
      id,
      versionId,
      organizationId,
      body,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/accept-changes')
  @RequirePermission('policy', 'update')
  @ApiOperation({ summary: 'Accept pending policy changes and publish the version' })
  @ApiParam(POLICY_PARAMS.policyId)
  async acceptPolicyChanges(
    @Param('id') id: string,
    @Body() body: { approverId: string; comment?: string },
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.acceptChanges(
      id,
      organizationId,
      body,
      authContext.userId,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/deny-changes')
  @RequirePermission('policy', 'update')
  @ApiOperation({ summary: 'Deny pending policy changes' })
  @ApiParam(POLICY_PARAMS.policyId)
  async denyPolicyChanges(
    @Param('id') id: string,
    @Body() body: { approverId: string; comment?: string },
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.policiesService.denyChanges(
      id,
      organizationId,
      body,
    );

    return {
      data,
      authType: authContext.authType,
      ...(authContext.userId && {
        authenticatedUser: {
          id: authContext.userId,
          email: authContext.userEmail,
        },
      }),
    };
  }

  @Post(':id/ai-chat')
  @RequirePermission('policy', 'read')
  @ApiOperation({
    summary: 'Chat with AI about a policy',
    description:
      'Stream AI responses for policy editing assistance. Returns a text/event-stream with AI-generated suggestions.',
  })
  @ApiParam(POLICY_PARAMS.policyId)
  @ApiBody({ type: AISuggestPolicyRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Streaming AI response',
    content: {
      'text/event-stream': {
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async aiChatPolicy(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @Body() body: AISuggestPolicyRequestDto,
    @Res() res: Response,
  ) {
    if (!process.env.OPENAI_API_KEY) {
      throw new HttpException(
        'AI service not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const policy = await this.policiesService.findById(id, organizationId);

    // Use currentVersion content if available, fallback to policy.content for backward compatibility
    const effectiveContent = policy.currentVersion?.content ?? policy.content;
    const policyContentText = this.convertPolicyContentToText(effectiveContent);

    const systemPrompt = `You are an expert GRC (Governance, Risk, and Compliance) policy editor. You help users edit and improve their organizational policies to meet compliance requirements like SOC 2, ISO 27001, and GDPR.

Current Policy Name: ${policy.name}
${policy.description ? `Policy Description: ${policy.description}` : ''}

Current Policy Content:
---
${policyContentText}
---

Your role:
1. Help users understand and improve their policies
2. Suggest specific changes when asked
3. Ensure policies remain compliant with relevant frameworks
4. Maintain professional, clear language appropriate for official documentation

When the user asks you to make changes to the policy:
1. First explain what changes you'll make and why
2. Then provide the COMPLETE updated policy content in a code block with the label \`\`\`policy
3. The policy content inside the code block should be in markdown format

IMPORTANT: When providing updated policy content, you MUST include the ENTIRE policy, not just the changed sections. The content in the \`\`\`policy code block will replace the entire current policy.

Keep responses helpful and focused on the policy editing task.`;

    const messages: UIMessage[] = [
      ...(body.chatHistory || []).map((msg) => ({
        id: crypto.randomUUID(),
        role: msg.role,
        content: msg.content,
        parts: [{ type: 'text' as const, text: msg.content }],
      })),
      {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: body.instructions,
        parts: [{ type: 'text' as const, text: body.instructions }],
      },
    ];

    const result = streamText({
      model: openai('gpt-5.1'),
      system: systemPrompt,
      messages: convertToModelMessages(messages),
    });

    return result.pipeTextStreamToResponse(res);
  }

  private convertPolicyContentToText(content: unknown): string {
    if (!content) return '';

    const contentArray = Array.isArray(content) ? content : [content];

    const extractText = (node: unknown): string => {
      if (!node || typeof node !== 'object') return '';

      const n = node as Record<string, unknown>;

      if (n.type === 'text' && typeof n.text === 'string') {
        return n.text;
      }

      if (Array.isArray(n.content)) {
        const texts = n.content.map(extractText).filter(Boolean);

        switch (n.type) {
          case 'heading': {
            const level = (n.attrs as Record<string, unknown>)?.level || 1;
            return (
              '\n' + '#'.repeat(Number(level)) + ' ' + texts.join('') + '\n'
            );
          }
          case 'paragraph':
            return texts.join('') + '\n';
          case 'bulletList':
          case 'orderedList':
            return '\n' + texts.join('');
          case 'listItem':
            return '- ' + texts.join('') + '\n';
          case 'blockquote':
            return '\n> ' + texts.join('\n> ') + '\n';
          default:
            return texts.join('');
        }
      }

      return '';
    };

    return contentArray.map(extractText).join('\n').trim();
  }
}
