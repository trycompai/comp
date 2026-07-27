import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpsertFindingContextDto {
  @ApiProperty({
    description: 'Penetration test run ID the finding belongs to',
    example: 'pentest-abc123',
  })
  @IsString()
  @IsNotEmpty()
  runId!: string;

  @ApiProperty({
    description:
      'Context for the finding, e.g. an accepted-by-design rationale or remediation details. Shared with the testing agent on future scans of the same target. Max 2000 characters.',
    example:
      'Read access to appConfiguration is accepted by design: the collection only holds non-secret bootstrap configuration and write access is restricted to privileged users.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  context!: string;
}
