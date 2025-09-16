import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsDateString,
  IsObject,
} from 'class-validator';

export enum PolicyStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  NEEDS_REVIEW = 'needs_review',
}

export enum Frequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum Departments {
  NONE = 'none',
  ADMIN = 'admin',
  GOV = 'gov',
  HR = 'hr',
  IT = 'it',
  ITSM = 'itsm',
  QMS = 'qms',
}

export class CreatePolicyDto {
  @ApiProperty({
    description: 'Name of the policy',
    example: 'Data Privacy Policy',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the policy',
    example: 'This policy outlines how we handle and protect personal data',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Status of the policy',
    enum: PolicyStatus,
    example: PolicyStatus.DRAFT,
    required: false,
  })
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;

  @ApiProperty({
    description: 'Content of the policy as TipTap JSON (array of nodes)',
    example: [
      {
        type: 'heading',
        attrs: { level: 2, textAlign: null },
        content: [{ type: 'text', text: 'Purpose' }],
      },
      {
        type: 'paragraph',
        attrs: { textAlign: null },
        content: [
          {
            type: 'text',
            text: 'Verify workforce integrity and grant the right access at start, revoke at end.',
          },
        ],
      },
    ],
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  @IsArray()
  content: unknown[];

  @ApiProperty({
    description: 'Review frequency of the policy',
    enum: Frequency,
    example: Frequency.YEARLY,
    required: false,
  })
  @IsOptional()
  @IsEnum(Frequency)
  frequency?: Frequency;

  @ApiProperty({
    description: 'Department this policy applies to',
    enum: Departments,
    example: Departments.IT,
    required: false,
  })
  @IsOptional()
  @IsEnum(Departments)
  department?: Departments;

  @ApiProperty({
    description: 'Whether this policy requires a signature',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequiredToSign?: boolean;

  @ApiProperty({
    description: 'Review date for the policy',
    example: '2024-12-31T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @ApiProperty({
    description: 'ID of the user assigned to this policy',
    example: 'usr_abc123def456',
    required: false,
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({
    description: 'ID of the user who approved this policy',
    example: 'usr_xyz789abc123',
    required: false,
  })
  @IsOptional()
  @IsString()
  approverId?: string;

  @ApiProperty({
    description: 'ID of the policy template this policy is based on',
    example: 'plt_template123',
    required: false,
  })
  @IsOptional()
  @IsString()
  policyTemplateId?: string;

  @ApiProperty({
    description: 'List of user IDs who have signed this policy',
    example: ['usr_123', 'usr_456'],
    type: 'array',
    items: { type: 'string' },
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  signedBy?: string[];
}
