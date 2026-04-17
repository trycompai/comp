import { ApiProperty } from '@nestjs/swagger';

export class PolicyAcknowledgmentItemDto {
  @ApiProperty({ example: 'mem_abc123', nullable: true })
  memberId!: string | null;

  @ApiProperty({ example: 'Alice Example', nullable: true })
  memberName!: string | null;

  @ApiProperty({ example: 'alice@example.com' })
  memberEmail!: string;

  @ApiProperty({ example: 'pv_xyz789' })
  policyVersionId!: string;

  @ApiProperty({ example: 3 })
  policyVersion!: number;

  @ApiProperty({ example: '2026-04-17T18:32:00.000Z' })
  signedAt!: string;
}

export class PolicyAcknowledgmentsResponseDto {
  @ApiProperty({ type: [PolicyAcknowledgmentItemDto] })
  data!: PolicyAcknowledgmentItemDto[];
}
