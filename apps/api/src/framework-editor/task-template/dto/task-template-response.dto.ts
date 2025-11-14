import { ApiProperty } from '@nestjs/swagger';
import { Frequency, Departments } from '@trycompai/db';

export class TaskTemplateResponseDto {
  @ApiProperty({
    description: 'Task template ID',
    example: 'frk_tt_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Task template name',
    example: 'Monthly Security Review',
  })
  name: string;

  @ApiProperty({
    description: 'Detailed description of the task template',
    example: 'Review and update security policies on a monthly basis',
  })
  description: string;

  @ApiProperty({
    description: 'Frequency of the task',
    enum: Frequency,
    example: Frequency.monthly,
  })
  frequency: Frequency;

  @ApiProperty({
    description: 'Department responsible for the task',
    enum: Departments,
    example: Departments.it,
  })
  department: Departments;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
