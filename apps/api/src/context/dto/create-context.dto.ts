import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateContextDto {
  @ApiProperty({
    description: 'The question or topic this context entry addresses',
    example: 'How do we handle user authentication in our application?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'The answer or detailed explanation for the question',
    example:
      'We use a hybrid authentication system supporting both API keys and session-based authentication. API keys are used for programmatic access while sessions are used for web interface interactions.',
  })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiProperty({
    description: 'Tags to categorize and help search this context entry',
    example: ['authentication', 'security', 'api', 'sessions'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
