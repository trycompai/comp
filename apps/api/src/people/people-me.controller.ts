import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { OrganizationId, UserId } from '../auth/auth-context.decorator';
import { PeopleMeService } from './people-me.service';

@ApiTags('People')
@Controller({ path: 'people/me', version: '1' })
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
@ApiHeader({
  name: 'X-Organization-Id',
  description:
    'Organization ID (required for JWT auth, optional for API key auth)',
  required: false,
})
export class PeopleMeController {
  constructor(private readonly peopleMeService: PeopleMeService) {}

  @Get()
  @ApiOperation({
    summary: 'Get the current user’s member record for the organization',
  })
  @ApiResponse({ status: 200, description: 'Member record' })
  async getMe(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.peopleMeService.getMe({ organizationId, userId });
  }

  @Get('training-videos')
  @ApiOperation({
    summary: 'Get training video completions for the current user',
  })
  @ApiResponse({ status: 200, description: 'Training video completions' })
  async getTrainingVideos(
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.peopleMeService.getTrainingVideos({ organizationId, userId });
  }

  @Post('training-videos/:videoId/complete')
  @ApiOperation({
    summary: 'Mark a training video as completed for the current user',
  })
  @ApiParam({
    name: 'videoId',
    description: 'Training video metadata ID (e.g. sat-1)',
  })
  @ApiResponse({ status: 200, description: 'Completion recorded' })
  async completeTrainingVideo(
    @Param('videoId') videoId: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    return this.peopleMeService.completeTrainingVideo({
      organizationId,
      userId,
      videoId,
    });
  }
}
