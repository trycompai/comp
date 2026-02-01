import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateVersionDto {
  @ApiProperty({
    description: 'Optional version ID to base the new version on',
    required: false,
    example: 'pv_abc123def456',
  })
  @IsOptional()
  @IsString()
  sourceVersionId?: string;

  @ApiProperty({
    description: 'Optional changelog to associate with the new version',
    required: false,
    example: 'Initial draft for quarterly updates',
  })
  @IsOptional()
  @IsString()
  changelog?: string;
}

export class UpdateVersionContentDto {
  @ApiProperty({
    description: 'Content of the policy version as TipTap JSON (array of nodes)',
    example: [
      {
        type: 'heading',
        attrs: { level: 2, textAlign: null },
        content: [{ type: 'text', text: 'Purpose' }],
      },
    ],
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  @IsArray()
  content: unknown[];
}

export class PublishVersionDto {
  @ApiProperty({
    description: 'Whether to set this version as the active version',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  setAsActive?: boolean;

  @ApiProperty({
    description: 'Optional changelog to associate with the published version',
    required: false,
    example: 'Updated access controls section',
  })
  @IsOptional()
  @IsString()
  changelog?: string;
}

export class SubmitForApprovalDto {
  @ApiProperty({
    description: 'Member ID of the approver',
    example: 'mem_abc123def456',
  })
  @IsString()
  approverId: string;
}
