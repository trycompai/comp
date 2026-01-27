import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendTrainingCompletionDto {
  @ApiProperty({
    description: 'The member ID who completed training',
    example: 'mem_abc123',
  })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({
    description: 'The organization ID',
    example: 'org_abc123',
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;
}

export class SendTrainingCompletionResponseDto {
  @ApiProperty({
    description: 'Whether the email was sent',
    example: true,
  })
  sent: boolean;

  @ApiProperty({
    description: 'Reason if email was not sent',
    example: 'training_not_complete',
    required: false,
  })
  reason?: string;
}
