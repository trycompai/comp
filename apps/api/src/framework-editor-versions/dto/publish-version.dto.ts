import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class PublishVersionDto {
  // Semver major.minor.patch. Accepts things like "1.0.0", "2.3.11".
  @IsString()
  @Matches(/^\d+\.\d+\.\d+$/, { message: 'version must be MAJOR.MINOR.PATCH' })
  version!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  releaseNotes?: string;
}
