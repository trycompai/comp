import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { AuthContext as AuthContextType } from '../auth/types';
import { AttachmentResponseDto } from '../tasks/dto/task-responses.dto';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './create-attachment.dto';

@ApiTags('Attachments')
@Controller({ path: 'attachments', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post()
  @RequirePermission('evidence', 'create')
  @ApiOperation({
    summary: 'Upload an attachment to any supported entity',
    description:
      'Upload a base64-encoded file and attach it to a task, vendor, risk, comment, or other supported entity type. The file is uploaded to S3 and a database record is created.',
  })
  @ApiBody({ type: CreateAttachmentDto })
  @ApiResponse({
    status: 201,
    description: 'Attachment uploaded successfully',
    type: AttachmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file data, unsupported file type, or file too large',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'File size exceeds maximum allowed size of 100MB',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid authentication',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: { message: { type: 'string', example: 'Unauthorized' } },
        },
      },
    },
  })
  async createAttachment(
    @AuthContext() authContext: AuthContextType,
    @Body() body: CreateAttachmentDto,
  ): Promise<AttachmentResponseDto> {
    // For API key auth, userId must be provided in the request body.
    // For session auth, use the authenticated user's ID.
    let userId: string;
    if (authContext.isApiKey) {
      if (!body.userId) {
        throw new BadRequestException(
          'User ID is required when using API key authentication. Provide userId in the request body.',
        );
      }
      userId = body.userId;
    } else {
      if (!authContext.userId) {
        throw new BadRequestException('User ID is required');
      }
      userId = authContext.userId;
    }

    return this.attachmentsService.uploadAttachment(
      authContext.organizationId,
      body.entityId,
      body.entityType,
      {
        fileName: body.fileName,
        fileType: body.fileType,
        fileData: body.fileData,
        description: body.description,
      },
      userId,
    );
  }

  @Get(':attachmentId/download')
  @RequirePermission('evidence', 'read')
  @ApiOperation({
    summary: 'Get attachment download URL',
    description: 'Generate a fresh signed URL for downloading any attachment',
  })
  @ApiParam({
    name: 'attachmentId',
    description: 'Unique attachment identifier',
    example: 'att_abc123def456',
  })
  @ApiResponse({
    status: 200,
    description: 'Download URL generated successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            downloadUrl: {
              type: 'string',
              description: 'Signed URL for downloading the file',
              example:
                'https://bucket.s3.amazonaws.com/path/to/file.pdf?signature=...',
            },
            expiresIn: {
              type: 'number',
              description: 'URL expiration time in seconds',
              example: 900,
            },
          },
        },
      },
    },
  })
  async getAttachmentDownloadUrl(
    @OrganizationId() organizationId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<{ downloadUrl: string; expiresIn: number }> {
    return await this.attachmentsService.getAttachmentDownloadUrl(
      organizationId,
      attachmentId,
    );
  }
}
