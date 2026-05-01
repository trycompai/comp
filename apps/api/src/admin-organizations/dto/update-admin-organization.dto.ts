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
}
