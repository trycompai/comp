import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAutomationDto {
  @ApiProperty({
    description: 'Task ID',
    example: 'tsk_abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  taskId: string;
}
