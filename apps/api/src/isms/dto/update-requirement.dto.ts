import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateRequirementDto {
  @IsOptional()
  @IsString()
  interestedPartyId?: string;

  @IsOptional()
  @IsString()
  partyName?: string;

  @IsOptional()
  @IsString()
  requirement?: string;

  @IsOptional()
  @IsString()
  treatment?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
