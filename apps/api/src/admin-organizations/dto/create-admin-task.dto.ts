import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

const TASK_STATUSES = [
  'todo',
  'in_progress',
  'in_review',
  'done',
  'not_relevant',
  'failed',
] as const;

const TASK_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
] as const;

const DEPARTMENTS = [
  'none',
  'admin',
  'gov',
  'hr',
  'it',
  'itsm',
  'qms',
] as const;

export class CreateAdminTaskDto {
  @ApiProperty({
    description: 'Title of the task',
    example: 'Review access controls',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Description of the task',
    example: 'Review and update access control policies quarterly',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Task status',
    enum: TASK_STATUSES,
    required: false,
  })
  @IsOptional()
  @IsIn([...TASK_STATUSES], {
    message: `Status must be one of: ${TASK_STATUSES.join(', ')}`,
  })
  status?: string;

  @ApiProperty({
    description: 'Task frequency',
    enum: TASK_FREQUENCIES,
    required: false,
  })
  @IsOptional()
  @IsIn([...TASK_FREQUENCIES], {
    message: `Frequency must be one of: ${TASK_FREQUENCIES.join(', ')}`,
  })
  frequency?: string;

  @ApiProperty({
    description: 'Department',
    enum: DEPARTMENTS,
    required: false,
  })
  @IsOptional()
  @IsIn([...DEPARTMENTS], {
    message: `Department must be one of: ${DEPARTMENTS.join(', ')}`,
  })
  department?: string;
}
