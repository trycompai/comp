import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import type { AwsScanMode } from '../aws-scan-mode';

/**
 * Request body for `PATCH /v1/cloud-security/connections/:id/scan-mode`.
 *
 * Only AWS connections accept this; the service layer validates the
 * connection is AWS before applying the change.
 */
export class UpdateAwsScanModeDto {
  @ApiProperty({
    description: 'Which scan engine to use for this AWS connection.',
    enum: ['comp_scanners', 'security_hub'],
    example: 'security_hub',
  })
  @IsString()
  @IsIn(['comp_scanners', 'security_hub'])
  mode!: AwsScanMode;
}
