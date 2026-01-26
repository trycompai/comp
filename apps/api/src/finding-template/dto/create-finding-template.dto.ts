import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';

export class CreateFindingTemplateDto {
  @ApiProperty({
    description: 'Category of the finding template',
    example: 'evidence_issue',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({
    description: 'Short title of the finding template',
    example: 'Issue with uploaded evidence',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Full message content of the finding template',
    example:
      'The uploaded evidence does not clearly show the Organization Name or URL. Please provide a screenshot showing the context.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Display order for the template',
    example: 0,
    required: false,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
