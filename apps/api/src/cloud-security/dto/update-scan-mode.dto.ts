import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { AWS_SCAN_MODES, type AwsScanMode } from '../aws-scan-mode';

/**
 * Request body for `PATCH /v1/cloud-security/connections/:id/scan-mode`.
 *
 * Only AWS connections accept this; the service layer validates the
 * connection is AWS before applying the change.
 *
 * The accepted values + Swagger enum both reference `AWS_SCAN_MODES`
 * directly so this DTO can't drift from the source of truth — adding a
 * new mode in `aws-scan-mode.ts` automatically widens what's accepted
 * here.
 */
export class UpdateAwsScanModeDto {
  @ApiProperty({
    description: 'Which scan engine to use for this AWS connection.',
    enum: AWS_SCAN_MODES,
    example: 'security_hub',
  })
  @IsString()
  @IsIn([...AWS_SCAN_MODES])
  mode!: AwsScanMode;
}
