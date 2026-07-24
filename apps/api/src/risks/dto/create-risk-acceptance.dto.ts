import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRiskAcceptanceDto {
  @ApiPropertyOptional({
    description:
      'Member ID of the acceptor. Defaults to the risk owner (assignee) when omitted.',
    example: 'mem_abc123def456',
  })
  @IsOptional()
  @IsString()
  acceptedById?: string;

  @ApiPropertyOptional({
    description: 'Optional notes recorded with the acceptance.',
    example: 'Residual risk reviewed at the Q2 risk review.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
