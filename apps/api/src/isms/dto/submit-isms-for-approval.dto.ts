import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SubmitIsmsForApprovalDto {
  @ApiProperty({
    description: 'Member ID of the approver to submit the ISMS to',
    example: 'mem_abc123def456',
  })
  @IsString()
  approverId!: string;
}
