import { IsArray, IsString, MinLength, ArrayMinSize } from 'class-validator';

export class ProcessDocumentsDto {
  @IsString()
  organizationId!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one document ID is required' })
  @IsString({ each: true })
  @MinLength(1, { each: true })
  documentIds!: string[];
}
