import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../../auth/platform-admin.guard';
import { UpdateIsmsDocumentTemplateDto } from './dto/update-isms-document-template.dto';
import { IsmsDocumentTemplateService } from './isms-document-template.service';

@ApiTags('Framework Editor ISMS Document Templates')
@Controller({ path: 'framework-editor/isms-document-template', version: '1' })
@UseGuards(PlatformAdminGuard)
export class IsmsDocumentTemplateController {
  constructor(private readonly service: IsmsDocumentTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'List ISMS document templates' })
  async findAll(@Query('frameworkId') frameworkId?: string) {
    return this.service.findAll(frameworkId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an ISMS document template' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIsmsDocumentTemplateDto,
  ) {
    return this.service.update(id, dto);
  }

  @Post(':id/requirements/:requirementId')
  @ApiOperation({
    summary: 'Link a requirement to an ISMS document template for a framework',
  })
  async linkRequirement(
    @Param('id') id: string,
    @Param('requirementId') requirementId: string,
    @Query('frameworkId') frameworkId?: string,
  ) {
    return this.service.linkRequirement({
      templateId: id,
      requirementId,
      frameworkId,
    });
  }

  @Delete(':id/requirements/:requirementId')
  @ApiOperation({
    summary:
      'Unlink a requirement from an ISMS document template for a framework',
  })
  async unlinkRequirement(
    @Param('id') id: string,
    @Param('requirementId') requirementId: string,
    @Query('frameworkId') frameworkId?: string,
  ) {
    return this.service.unlinkRequirement({
      templateId: id,
      requirementId,
      frameworkId,
    });
  }
}
