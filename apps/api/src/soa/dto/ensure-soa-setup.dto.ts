import { IsString } from 'class-validator';

export class EnsureSOASetupDto {
  @IsString()
  organizationId!: string;

  @IsString()
  frameworkId!: string;
}
