import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateInterestedPartyDto {
  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsString()
  needsExpectations!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
