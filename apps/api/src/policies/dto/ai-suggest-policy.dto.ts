import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class AISuggestPolicyRequestDto {
  @ApiProperty({
    description: 'User instructions about what changes to make to the policy',
    example:
      'Update the data retention section to specify a 7-year retention period',
  })
  @IsString()
  instructions: string;

  @ApiProperty({
    description:
      'Chat history for context (array of messages with role and content)',
    example: [
      { role: 'user', content: 'Update the data retention policy' },
      { role: 'assistant', content: 'I can help with that...' },
    ],
    required: false,
    type: 'array',
    items: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['user', 'assistant'] },
        content: { type: 'string' },
      },
    },
  })
  @IsOptional()
  @IsArray()
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}
