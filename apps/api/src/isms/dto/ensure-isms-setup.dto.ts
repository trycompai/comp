import { IsString } from 'class-validator';

export class EnsureIsmsSetupDto {
  @IsString()
  organizationId!: string;

  @IsString()
  frameworkId!: string;
}
