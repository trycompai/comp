import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetDomainStatusDto {
  @ApiProperty({
    description: 'The domain name to check status for',
    example: 'portal.example.com',
  })
  @IsString()
  @IsNotEmpty()
  domain: string;
}

export class DomainVerificationDto {
  @ApiProperty({ description: 'Verification type (e.g., TXT, CNAME)' })
  type: string;

  @ApiProperty({ description: 'Domain for verification' })
  domain: string;

  @ApiProperty({ description: 'Verification value' })
  value: string;

  @ApiProperty({
    description: 'Reason for verification status',
    required: false,
  })
  reason?: string;
}

export class DomainStatusResponseDto {
  @ApiProperty({ description: 'The domain name' })
  domain: string;

  @ApiProperty({ description: 'Whether the domain is verified' })
  verified: boolean;

  @ApiProperty({
    description: 'Verification records for the domain',
    type: [DomainVerificationDto],
    required: false,
  })
  verification?: DomainVerificationDto[];
}
