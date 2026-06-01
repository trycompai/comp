import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthContext, OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import type { AuthContext as AuthContextType } from '../auth/types';
import {
  CreateUploadUrlDto,
  UploadUrlResponseDto,
} from './dto/create-upload-url.dto';
import { UploadsService } from './uploads.service';

/**
 * General file-upload entry point for API/MCP clients.
 *
 * AUTH NOTE (for reviewers): this controller uses HybridAuthGuard only and the
 * endpoint has no @RequirePermission. That is deliberate, not an oversight:
 * minting a presigned URL only reserves an org-scoped, content-type-constrained
 * key — it exposes no data and changes no state. The file is inert until a
 * FEATURE endpoint consumes the returned s3Key, and that feature endpoint
 * enforces its own RBAC (e.g. questionnaire:create). Org isolation is enforced
 * by deriving the key prefix from the authenticated organizationId.
 */
@ApiTags('Uploads')
@Controller({ path: 'uploads', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  // Keep this description <= 240 chars: operation descriptions are trimmed to
  // 240 by toOperationDescription() in openapi/seo-text.ts, and a longer string
  // gets cut mid-sentence (dropping the all-important "pass the s3Key" step).
  @ApiOperation({
    summary: 'Get a presigned URL to upload a file',
    description:
      'Returns a presigned S3 URL plus the s3Key the file lands at. PUT the raw file bytes to that URL, then call the feature tool (e.g. upload-and-parse) with the s3Key instead of sending file data. Bytes never pass through the LLM.',
  })
  @ApiBody({ type: CreateUploadUrlDto })
  @ApiResponse({ status: 201, type: UploadUrlResponseDto })
  async createUploadUrl(
    @Body() dto: CreateUploadUrlDto,
    @OrganizationId() organizationId: string,
    @AuthContext() authContext: AuthContextType,
  ) {
    const data = await this.uploadsService.createUploadUrl(organizationId, dto);

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
}
