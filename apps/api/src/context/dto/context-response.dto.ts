import { ApiProperty } from '@nestjs/swagger';

export class ContextResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the context entry',
    example: 'ctx_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID this context entry belongs to',
    example: 'org_xyz789uvw012',
  })
  organizationId: string;

  @ApiProperty({
    description: 'The question or topic this context entry addresses',
    example: 'How do we handle user authentication in our application?',
  })
  question: string;

  @ApiProperty({
    description: 'The answer or detailed explanation for the question',
    example:
      'We use a hybrid authentication system supporting both API keys and session-based authentication.',
  })
  answer: string;

  @ApiProperty({
    description: 'Tags to categorize and help search this context entry',
    example: ['authentication', 'security', 'api', 'sessions'],
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    description: 'Timestamp when the context entry was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the context entry was last updated',
    example: '2024-01-15T14:20:00.000Z',
  })
  updatedAt: Date;
}
