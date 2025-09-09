import { ApiProperty } from '@nestjs/swagger';

export class MemberResponseDto {
  @ApiProperty({
    description: 'Member ID',
    example: 'mem_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'User ID associated with member',
    example: 'usr_abc123def456',
  })
  userId: string;

  @ApiProperty({
    description: 'Member role',
    example: 'admin',
  })
  role: string;

  @ApiProperty({
    description: 'Member department',
    example: 'engineering',
    nullable: true,
  })
  department: string | null;

  @ApiProperty({
    description: 'Whether member is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'FleetDM label ID for member devices',
    example: 123,
    nullable: true,
  })
  fleetDmLabelId: number | null;

  @ApiProperty({
    description: 'Organization ID this member belongs to',
    example: 'org_abc123def456',
  })
  organizationId: string;

  @ApiProperty({
    description: 'When the member was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;
}
