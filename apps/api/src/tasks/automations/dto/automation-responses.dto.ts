import { ApiProperty } from '@nestjs/swagger';

export class AutomationResponseDto {
  @ApiProperty({
    description: 'Automation ID',
    example: 'auto_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Automation name',
    example: 'Task Name - Evidence Collection',
  })
  name: string;

  @ApiProperty({
    description: 'Task ID this automation belongs to',
    example: 'tsk_abc123def456',
  })
  taskId: string;

  @ApiProperty({
    description: 'Organization ID',
    example: 'org_abc123def456',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Automation status',
    example: 'active',
    enum: ['active', 'inactive', 'draft'],
  })
  status: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;
}

export class CreateAutomationResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Created automation details',
    type: () => AutomationResponseDto,
  })
  automation: {
    id: string;
    name: string;
  };
}
