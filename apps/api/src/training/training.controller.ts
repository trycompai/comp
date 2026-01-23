import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { TrainingService } from './training.service';
import {
  SendTrainingCompletionDto,
  SendTrainingCompletionResponseDto,
} from './dto/send-training-completion.dto';
import { HybridAuthGuard } from '../auth/hybrid-auth.guard';

@ApiTags('Training')
@Controller('training')
@UseGuards(HybridAuthGuard)
@ApiSecurity('apikey')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('send-completion-email')
  @HttpCode(HttpStatus.OK)
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
    @Body() dto: SendTrainingCompletionDto,
  ): Promise<SendTrainingCompletionResponseDto> {
    const result =
      await this.trainingService.sendTrainingCompletionEmailIfComplete(
        dto.memberId,
        dto.organizationId,
      );

    return result;
  }
}
