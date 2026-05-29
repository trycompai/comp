import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateInterestedPartyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  needsExpectations?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
