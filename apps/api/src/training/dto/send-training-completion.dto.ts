import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SendTrainingCompletionDto {
  @ApiProperty({
    description: 'The member ID who completed training',
    example: 'mem_abc123',
  })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({
    description: 'Organization ID (deprecated — use auth context)',
    example: 'org_abc123',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
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
