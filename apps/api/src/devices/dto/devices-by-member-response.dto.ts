import { ApiProperty } from '@nestjs/swagger';
import { DeviceResponseDto } from './device-responses.dto';
import { MemberResponseDto } from './member-responses.dto';

export class DevicesByMemberResponseDto {
  @ApiProperty({
    description: 'Array of devices assigned to the member',
    type: [DeviceResponseDto],
  })
  data: DeviceResponseDto[];

  @ApiProperty({
    description: 'Total number of devices for this member',
    example: 3,
  })
  count: number;

  @ApiProperty({
    description: 'Member information',
    type: MemberResponseDto,
  })
  member: MemberResponseDto;

  @ApiProperty({
    description: 'How the request was authenticated',
    enum: ['api-key', 'session'],
    example: 'api-key',
  })
  authType: string;

  @ApiProperty({
    description: 'Authenticated user information (present for session auth)',
    required: false,
    example: {
      id: 'usr_abc123def456',
      email: 'user@company.com',
    },
  })
  authenticatedUser?: {
    id: string;
    email: string;
  };
}
