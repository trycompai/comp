import { ApiProperty } from '@nestjs/swagger';

export class BadRequestResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Invalid task ID or organization ID',
  })
  message: string;
}

export class UnauthorizedResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Unauthorized',
  })
  message: string;
}

export class TaskNotFoundResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Task not found',
  })
  message: string;
}
