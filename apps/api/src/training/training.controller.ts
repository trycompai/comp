import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Param,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProduces,
  ApiSecurity,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { TrainingService } from './training.service';
import {
  SendTrainingCompletionDto,
  SendTrainingCompletionResponseDto,
} from './dto/send-training-completion.dto';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { RequirePermission } from '../auth/require-permission.decorator';
import { OrganizationId, MemberId } from '../auth/auth-context.decorator';

@ApiTags('Training')
@Controller({ path: 'training', version: '1' })
@UseGuards(HybridAuthGuard, PermissionGuard)
@ApiSecurity('apikey')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('completions')
  @RequirePermission('portal', 'read')
  @ApiOperation({
    summary: 'Get training video completions for the authenticated user',
    description:
      'Returns all training video completion records for the authenticated member. Requires session authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of training video completion records',
  })
  async getCompletions(
    @MemberId() memberId: string | undefined,
    @OrganizationId() organizationId: string,
  ) {
    if (!memberId) {
      throw new BadRequestException('Session authentication required');
    }
    return this.trainingService.getCompletions(memberId, organizationId);
  }

  @Post('completions/:videoId/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('portal', 'update')
  @ApiOperation({
    summary: 'Mark a training video as complete',
    description:
      'Marks a specific training video as completed for the authenticated member. Triggers completion email if all training is now done.',
  })
  @ApiResponse({
    status: 200,
    description: 'The updated completion record',
  })
  async markVideoComplete(
    @MemberId() memberId: string | undefined,
    @OrganizationId() organizationId: string,
    @Param('videoId') videoId: string,
  ) {
    if (!memberId) {
      throw new BadRequestException('Session authentication required');
    }
    return this.trainingService.markVideoComplete(
      memberId,
      organizationId,
      videoId,
    );
  }

  @Post('send-completion-email')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training', 'update')
  @ApiOperation({
    summary: 'Send training completion email with certificate',
    description:
      'Checks if the member has completed all training videos. If so, sends an email with the training certificate attached.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email sent or reason why it was not sent',
    type: SendTrainingCompletionResponseDto,
  })
  async sendTrainingCompletionEmail(
    @OrganizationId() organizationId: string,
    @Body() dto: SendTrainingCompletionDto,
  ): Promise<SendTrainingCompletionResponseDto> {
    const result =
      await this.trainingService.sendTrainingCompletionEmailIfComplete(
        dto.memberId,
        organizationId,
      );

    return result;
  }

  @Post('generate-certificate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training', 'read')
  @ApiOperation({
    summary: 'Generate training completion certificate PDF',
    description:
      'Generates a PDF certificate for a member who has completed all training videos. Returns the PDF as a downloadable file.',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'PDF certificate file',
  })
  @ApiResponse({
    status: 400,
    description: 'Training not complete or member not found',
  })
  async generateCertificate(
    @OrganizationId() organizationId: string,
    @Body() dto: SendTrainingCompletionDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.trainingService.generateCertificate(
      dto.memberId,
      organizationId,
    );

    if ('error' in result) {
      throw new BadRequestException(result.error);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.send(result.pdf);
  }

  @Post('generate-hipaa-certificate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('training', 'read')
  @ApiOperation({
    summary: 'Generate HIPAA training certificate PDF',
    description:
      'Generates a PDF certificate for a member who has completed the HIPAA Security Awareness Training.',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF certificate file' })
  @ApiResponse({
    status: 400,
    description: 'HIPAA training not complete or member not found',
  })
  async generateHipaaCertificate(
    @OrganizationId() organizationId: string,
    @Body() dto: SendTrainingCompletionDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.trainingService.generateHipaaCertificate(
      dto.memberId,
      organizationId,
    );

    if ('error' in result) {
      throw new BadRequestException(result.error);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.send(result.pdf);
  }
}
