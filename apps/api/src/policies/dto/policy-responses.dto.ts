import { ApiProperty } from '@nestjs/swagger';
import { PolicyStatus, Frequency, Departments } from './create-policy.dto';

export class PolicyResponseDto {
  @ApiProperty({
    description: 'The policy ID',
    example: 'pol_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the policy',
    example: 'Data Privacy Policy',
  })
  name: string;

  @ApiProperty({
    description: 'Description of the policy',
    example: 'This policy outlines how we handle and protect personal data',
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: 'Status of the policy',
    enum: PolicyStatus,
    example: PolicyStatus.DRAFT,
  })
  status: PolicyStatus;

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
  content: unknown[];

  @ApiProperty({
    description: 'Review frequency of the policy',
    enum: Frequency,
    example: Frequency.YEARLY,
    nullable: true,
  })
  frequency?: Frequency;

  @ApiProperty({
    description: 'Department this policy applies to',
    enum: Departments,
    example: Departments.IT,
    nullable: true,
  })
  department?: Departments;

  @ApiProperty({
    description: 'Whether this policy requires a signature',
    example: true,
  })
  isRequiredToSign: boolean;

  @ApiProperty({
    description: 'List of user IDs who have signed this policy',
    example: ['usr_123', 'usr_456'],
    type: 'array',
    items: { type: 'string' },
  })
  signedBy: string[];

  @ApiProperty({
    description: 'Review date for the policy',
    example: '2024-12-31T00:00:00.000Z',
    nullable: true,
  })
  reviewDate?: Date;

  @ApiProperty({
    description: 'Whether this policy is archived',
    example: false,
  })
  isArchived: boolean;

  @ApiProperty({
    description: 'When the policy was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the policy was last updated',
    example: '2024-01-15T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'When the policy was last archived',
    example: '2024-02-01T00:00:00.000Z',
    nullable: true,
  })
  lastArchivedAt?: Date;

  @ApiProperty({
    description: 'When the policy was last published',
    example: '2024-01-10T00:00:00.000Z',
    nullable: true,
  })
  lastPublishedAt?: Date;

  @ApiProperty({
    description: 'Organization ID this policy belongs to',
    example: 'org_abc123def456',
  })
  organizationId: string;

  @ApiProperty({
    description: 'ID of the user assigned to this policy',
    example: 'usr_abc123def456',
    nullable: true,
  })
  assigneeId?: string;

  @ApiProperty({
    description: 'ID of the user who approved this policy',
    example: 'usr_xyz789abc123',
    nullable: true,
  })
  approverId?: string;

  @ApiProperty({
    description: 'ID of the policy template this policy is based on',
    example: 'plt_template123',
    nullable: true,
  })
  policyTemplateId?: string;
}
