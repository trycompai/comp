import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
  UnauthorizedException,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProduces,
  ApiHeader,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { TrainingService } from './training.service';
import {
  SendTrainingCompletionDto,
  SendTrainingCompletionResponseDto,
} from './dto/send-training-completion.dto';

@ApiTags('Training')
@Controller('training')
export class TrainingController {
  private validateInternalToken(token: string | undefined): void {
    const expectedToken = process.env.INTERNAL_API_TOKEN;

    if (!expectedToken) {
      throw new UnauthorizedException(
        'INTERNAL_API_TOKEN not configured on server',
      );
    }

    if (!token || token !== expectedToken) {
      throw new UnauthorizedException('Invalid or missing internal API token');
    }
  }
  constructor(private readonly trainingService: TrainingService) {}

  @Post('send-completion-email')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-internal-token',
    description: 'Internal API token for service-to-service calls',
    required: true,
  })
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
    @Headers('x-internal-token') token: string,
    @Body() dto: SendTrainingCompletionDto,
  ): Promise<SendTrainingCompletionResponseDto> {
    this.validateInternalToken(token);

    const result =
      await this.trainingService.sendTrainingCompletionEmailIfComplete(
        dto.memberId,
        dto.organizationId,
      );

    return result;
  }

  @Post('generate-certificate')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({
    name: 'x-internal-token',
    description: 'Internal API token for service-to-service calls',
    required: true,
  })
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
    @Headers('x-internal-token') token: string,
    @Body() dto: SendTrainingCompletionDto,
    @Res() res: Response,
  ): Promise<void> {
    this.validateInternalToken(token);

    const result = await this.trainingService.generateCertificate(
      dto.memberId,
      dto.organizationId,
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
