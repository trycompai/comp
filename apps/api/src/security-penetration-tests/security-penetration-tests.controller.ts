import {
  Controller,
  Get,
  HttpCode,
  Body,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { Response } from 'express';
import { OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { Public } from '../auth/public.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CreatePenetrationTestDto } from './dto/create-penetration-test.dto';
import { SecurityPenetrationTestsService } from './security-penetration-tests.service';

@ApiTags('Security Penetration Tests')
@Controller({ path: 'security-penetration-tests', version: '1' })
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description: 'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
@UseGuards(HybridAuthGuard, PermissionGuard)
export class SecurityPenetrationTestsController {
  constructor(
    private readonly service: SecurityPenetrationTestsService,
  ) {}

  @Get()
  @RequirePermission('pentest', 'read')
  @ApiOperation({
    summary: 'List penetration test runs',
    description:
      'Returns all penetration tests created for the organization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Penetration tests returned',
  })
  async list(@OrganizationId() organizationId: string) {
    return this.service.listReports(organizationId);
  }

  @Post()
  @RequirePermission('pentest', 'create')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create penetration test',
    description:
      'Creates a new penetration test run and returns the run metadata.',
  })
  @ApiResponse({
    status: 201,
    description: 'Penetration test created',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  async create(
    @OrganizationId() organizationId: string,
    @Body() body: CreatePenetrationTestDto,
  ) {
    return this.service.createReport(organizationId, body);
  }

  @Get('github/repos')
  @RequirePermission('pentest', 'read')
  @ApiOperation({
    summary: 'List accessible GitHub repositories',
    description:
      'Returns GitHub repositories accessible with the connected GitHub integration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Repository list returned',
  })
  async listGithubRepos(@OrganizationId() organizationId: string) {
    return this.service.listGithubRepos(organizationId);
  }

  @Get(':id')
  @RequirePermission('pentest', 'read')
  @ApiOperation({
    summary: 'Get penetration test status',
    description: 'Returns a penetration test run with progress metadata.',
  })
  @ApiResponse({
    status: 200,
    description: 'Penetration test returned',
  })
  @ApiResponse({
    status: 404,
    description: 'Penetration test not found',
  })
  async getById(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.getReport(organizationId, id);
  }

  @Get(':id/progress')
  @RequirePermission('pentest', 'read')
  @ApiOperation({
    summary: 'Get penetration test progress',
    description: 'Returns detailed progress for an in-flight report run.',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress returned',
  })
  async getProgress(@OrganizationId() organizationId: string, @Param('id') id: string) {
    return this.service.getReportProgress(organizationId, id);
  }

  @Get(':id/report')
  @RequirePermission('pentest', 'read')
  @ApiOperation({
    summary: 'Get penetration test output',
    description: 'Returns the markdown report output for a completed run.',
  })
  @ApiResponse({
    status: 200,
    description: 'Markdown report output',
  })
  async getReport(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const output = await this.service.getReportOutput(organizationId, id);

    response.set({
      'Content-Type': output.contentType,
      'Cache-Control': 'no-store',
    });

    return new StreamableFile(output.buffer);
  }

  @Get(':id/pdf')
  @RequirePermission('pentest', 'read')
  @ApiOperation({
    summary: 'Get penetration test PDF',
    description: 'Returns the PDF version of a completed report.',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF report artifact',
  })
  async getPdf(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const output = await this.service.getReportPdf(organizationId, id);

    response.set({
      'Content-Type': output.contentType,
      'Content-Disposition':
        output.contentDisposition ??
        `attachment; filename="penetration-test-${id}.pdf"`,
      'Cache-Control': 'no-store',
    });

    return new StreamableFile(output.buffer);
  }

  @Post('webhook')
  @Public()
  @ApiOperation({
    summary: 'Receive penetration test webhook events',
    description:
      'Receives callback payloads from the penetration test provider when a run is updated. Per-run webhook token validation is enforced when handshake state exists.',
  })
  @ApiHeader({
    name: 'X-Webhook-Id',
    description:
      'Optional provider event identifier used for idempotency detection.',
    required: false,
  })
  @ApiHeader({
    name: 'X-Webhook-Token',
    description:
      'Optional webhook token header. Query param webhookToken is also accepted.',
    required: false,
  })
  @ApiQuery({
    name: 'webhookToken',
    required: false,
    description:
      'Per-job webhook token used for handshake validation when callbacks are sent to Comp.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook handled',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook payload',
  })
  @HttpCode(200)
  async handleWebhook(
    @Req() request: Request,
    @Body() body: Record<string, unknown>,
  ) {
    const webhookToken =
      this.extractStringFromQuery(request, 'webhookToken') ??
      this.extractStringFromHeader(request, 'x-webhook-token');
    const eventId =
      this.extractStringFromHeader(request, 'x-webhook-id') ??
      this.extractStringFromHeader(request, 'x-request-id');

    return this.service.handleWebhook(body, {
      webhookToken,
      eventId,
    });
  }

  private extractStringFromQuery(request: Request, key: string): string | undefined {
    const queryValue = request.query[key];
    if (Array.isArray(queryValue)) {
      return this.extractStringFromQueryValue(queryValue[0]);
    }

    return this.extractStringFromQueryValue(queryValue);
  }

  private extractStringFromQueryValue(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private extractStringFromHeader(
    request: Request,
    key: string,
  ): string | undefined {
    const headerValue = request.headers[key.toLowerCase()];

    if (Array.isArray(headerValue)) {
      return typeof headerValue[0] === 'string' ? headerValue[0] : undefined;
    }

    return typeof headerValue === 'string' ? headerValue : undefined;
  }
}
