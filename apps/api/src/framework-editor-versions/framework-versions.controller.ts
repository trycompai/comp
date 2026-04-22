import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { type AdminRequest } from '../admin-organizations/platform-admin-auth-context';
import { FrameworkVersionsService } from './framework-versions.service';
import { PublishVersionDto } from './dto/publish-version.dto';

@ApiExcludeController()
@Controller({ path: 'framework-editor/framework/:frameworkId/versions', version: '1' })
@UseGuards(PlatformAdminGuard)
export class FrameworkVersionsController {
  constructor(private readonly service: FrameworkVersionsService) {}

  @Post()
  async publish(
    @Param('frameworkId') frameworkId: string,
    @Body() body: PublishVersionDto,
    @Req() req: AdminRequest,
  ) {
    const version = await this.service.publish({
      frameworkId,
      version: body.version,
      releaseNotes: body.releaseNotes,
      publishedById: req.userId,
    });
    return { data: version };
  }

  @Get()
  async list(@Param('frameworkId') frameworkId: string) {
    const versions = await this.service.list(frameworkId);
    return { data: versions, count: versions.length };
  }

  @Get(':versionId')
  async get(
    @Param('frameworkId') frameworkId: string,
    @Param('versionId') versionId: string,
  ) {
    const version = await this.service.get(frameworkId, versionId);
    return { data: version };
  }
}

@ApiExcludeController()
@Controller({ path: 'framework-editor/framework/:frameworkId', version: '1' })
@UseGuards(PlatformAdminGuard)
export class FrameworkDraftDiffController {
  constructor(private readonly service: FrameworkVersionsService) {}

  @Get('draft-diff')
  async getDraftDiff(@Param('frameworkId') frameworkId: string) {
    const data = await this.service.getDraftDiff(frameworkId);
    return { data };
  }
}
