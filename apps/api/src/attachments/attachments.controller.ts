import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { AttachmentsService } from './attachments.service';

@ApiTags('Attachments')
@Controller({ path: 'attachments', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get(':attachmentId/download')
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
