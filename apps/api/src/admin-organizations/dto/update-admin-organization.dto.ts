import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAdminOrganizationDto {
  @ApiPropertyOptional({
    description:
      'Whether the organization has platform access (controls dashboard login).',
  })
  @IsOptional()
  @IsBoolean()
  hasAccess?: boolean;

  @ApiPropertyOptional({
    description:
      'When true, the organization requires background checks for people completion. When false, BG checks are bypassed and excluded from counts.',
  })
  @IsOptional()
  @IsBoolean()
  backgroundCheckStepEnabled?: boolean;

  @ApiPropertyOptional({
    description:
      "When true, the organization is platform-operated (e.g. Comp AI's own org). Platform admins are then treated as real participants — assignable, counted in compliance, and notified. Leave false for all customer orgs.",
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
