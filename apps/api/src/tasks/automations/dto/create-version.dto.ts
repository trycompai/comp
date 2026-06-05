import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

/**
 * Records that an automation script has been generated + published to S3.
 * `version` and `scriptKey` are REQUIRED — the row references an already-stored
 * script. The web UI's publish flow supplies both from the enterprise publish
 * step; calling this without them used to 500 (Prisma non-null violation).
 */
export class CreateVersionDto {
  @ApiProperty({
    description: 'Version number for this published script',
    example: 1,
  })
  @IsInt()
  @Min(1)
  version!: number;

  @ApiProperty({
    description:
      'S3 key of the already-generated & published automation script (returned by the publish step).',
    example: 'org_abc123/tsk_abc123/aut_abc123.v1.js',
  })
  @IsString()
  @IsNotEmpty()
  scriptKey!: string;

  @ApiProperty({
    description: 'Optional changelog describing this version',
    required: false,
  })
  @IsOptional()
  @IsString()
  changelog?: string;
}
