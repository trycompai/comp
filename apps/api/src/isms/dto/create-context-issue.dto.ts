import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { IsmsContextIssueKind } from '@db';

export class CreateContextIssueDto {
  @IsIn(['internal', 'external'])
  kind!: IsmsContextIssueKind;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  description!: string;

  @IsString()
  effect!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
