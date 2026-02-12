import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationId } from '../auth/auth-context.decorator';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { OrgChartService } from './org-chart.service';
import { UpsertOrgChartDto } from './dto/upsert-org-chart.dto';
import { UploadOrgChartDto } from './dto/upload-org-chart.dto';

@ApiTags('Org Chart')
@Controller({ path: 'org-chart', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for session auth, optional for API key auth)',
  required: false,
})
export class OrgChartController {
  constructor(private readonly orgChartService: OrgChartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the organization chart' })
  @ApiResponse({ status: 200, description: 'The organization chart' })
  async getOrgChart(@OrganizationId() organizationId: string) {
    return await this.orgChartService.findByOrganization(organizationId);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update an interactive organization chart' })
  @ApiResponse({ status: 200, description: 'The saved organization chart' })
  @UsePipes(new ValidationPipe({ whitelist: false, transform: false }))
  async upsertOrgChart(
    @OrganizationId() organizationId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const dto: UpsertOrgChartDto = {
      name: typeof body?.name === 'string' ? body.name : undefined,
      nodes: Array.isArray(body?.nodes) ? body.nodes : [],
      edges: Array.isArray(body?.edges) ? body.edges : [],
    };
    return await this.orgChartService.upsertInteractive(organizationId, dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload an image as the organization chart' })
  @ApiResponse({ status: 201, description: 'The uploaded organization chart' })
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async uploadOrgChart(
    @OrganizationId() organizationId: string,
    @Body() dto: UploadOrgChartDto,
  ) {
    return await this.orgChartService.uploadImage(organizationId, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete the organization chart' })
  @ApiResponse({ status: 200, description: 'Deletion confirmation' })
  async deleteOrgChart(@OrganizationId() organizationId: string) {
    return await this.orgChartService.delete(organizationId);
  }
}
