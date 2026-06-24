import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * Fields an organization member may update on their own organization.
 *
 * Note: this is a class (not an interface) on purpose — the global
 * ValidationPipe runs with `whitelist` + `forbidNonWhitelisted`, which only
 * enforce the contract when class-validator metadata survives to runtime.
 * Properties that are not represented here are rejected by the pipe. The
 * request/response documentation lives in `organization-api-bodies.ts`.
 */
export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  metadata?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;

  @IsOptional()
  @IsInt()
  fleetDmLabelId?: number;

  @IsOptional()
  @IsBoolean()
  isFleetSetupCompleted?: boolean;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsBoolean()
  advancedModeEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  backgroundCheckStepEnabled?: boolean;
}
