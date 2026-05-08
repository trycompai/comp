import { IsBoolean, IsString, IsNotEmpty } from 'class-validator';

export class UpdateFeatureFlagDto {
  @IsString()
  @IsNotEmpty()
  flagKey!: string;

  @IsBoolean()
  enabled!: boolean;
}
