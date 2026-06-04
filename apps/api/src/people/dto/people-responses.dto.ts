import { ApiProperty } from '@nestjs/swagger';
import { BackgroundCheckStatus, Departments } from '@db';

export class BackgroundCheckSummaryDto {
  @ApiProperty({
    description: 'Background check request ID',
    example: 'bcr_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Background check status',
    enum: BackgroundCheckStatus,
    example: BackgroundCheckStatus.invited,
  })
  status: BackgroundCheckStatus;

  requesterNotes?: string | null;
}

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 'usr_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@company.com',
  })
  email: string;

  @ApiProperty({
    description: 'Whether email is verified',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'User profile image URL',
    example: 'https://example.com/avatar.jpg',
    nullable: true,
  })
  image: string | null;

  @ApiProperty({
    description: 'When the user was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the user was last updated',
    example: '2024-01-15T00:00:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Last login time',
    example: '2024-01-15T12:00:00Z',
    nullable: true,
  })
  lastLogin: Date | null;

  @ApiProperty({
    description:
      'Platform role of the user (managed by Better Auth admin plugin)',
    example: 'user',
    nullable: true,
  })
  role: string | null;
}

export class PeopleResponseDto {
  @ApiProperty({
    description: 'Member ID',
    example: 'mem_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID this member belongs to',
    example: 'org_abc123def456',
  })
  organizationId: string;

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
    description: 'When the member was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description:
      'Member department. May be one of the built-in values (none, admin, gov, hr, it, itsm, qms) or a custom department name.',
    example: Departments.it,
    type: 'string',
  })
  department: string;

  @ApiProperty({
    description: 'Job title for the member',
    example: 'Software Engineer',
    nullable: true,
  })
  jobTitle: string | null;

  @ApiProperty({
    description: 'Whether member is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether member is deactivated',
    example: false,
  })
  deactivated: boolean;

  @ApiProperty({
    description: 'FleetDM label ID for member devices',
    example: 123,
    nullable: true,
  })
  fleetDmLabelId: number | null;

  @ApiProperty({
    description: 'User information',
    type: UserResponseDto,
  })
  user: UserResponseDto;

  @ApiProperty({
    description: 'Background check requests for this member',
    type: [BackgroundCheckSummaryDto],
    required: false,
  })
  backgroundCheckRequests?: BackgroundCheckSummaryDto[];
}
