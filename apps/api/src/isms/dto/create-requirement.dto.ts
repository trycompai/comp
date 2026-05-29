import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRequirementDto {
  @IsOptional()
  @IsString()
  interestedPartyId?: string;

  @IsString()
  partyName!: string;

  @IsString()
  requirement!: string;

  @IsString()
  treatment!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
