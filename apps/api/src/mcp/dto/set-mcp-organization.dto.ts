import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetMcpOrganizationDto {
  @ApiProperty({
    description:
      'The organization the MCP/AI connection should act on. Must be one you are a member of.',
    example: 'org_abc123',
  })
  @IsString()
  @IsNotEmpty()
  organizationId!: string;
}
