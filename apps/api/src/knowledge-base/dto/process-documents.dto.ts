import { IsArray, IsString, MinLength } from 'class-validator';

export class ProcessDocumentsDto {
  @IsString()
  organizationId!: string;

  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  documentIds!: string[];
}


