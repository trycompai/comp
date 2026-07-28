import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AnswerSingleQuestionDto {
  @ApiProperty({
    description: 'Security questionnaire question to answer.',
    example: 'Do you encrypt customer data at rest?',
  })
  @IsString()
  question!: string;

  @ApiProperty({
    description: 'Zero-based index of this question in the questionnaire or page batch.',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  questionIndex!: number;

  @ApiProperty({
    description: 'Total number of questions in the current questionnaire or page batch.',
    example: 12,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  totalQuestions!: number;

  @ApiProperty({
    description:
      'Organization ID for validation. The API uses the authenticated active organization and overwrites this value server-side.',
    example: 'org_abc123',
  })
  @IsString()
  organizationId!: string;

  @ApiPropertyOptional({
    description:
      'Optional questionnaire record to save the generated answer into. Omit for webpage-only answer generation.',
    example: 'qst_abc123',
  })
  @IsOptional()
  @IsString()
  questionnaireId?: string;
}
