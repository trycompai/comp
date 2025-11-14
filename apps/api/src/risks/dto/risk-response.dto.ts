import { ApiProperty } from '@nestjs/swagger';
import {
  RiskCategory,
  Departments,
  RiskStatus,
  Likelihood,
  Impact,
  RiskTreatmentType,
} from '@trycompai/db';

export class RiskResponseDto {
  @ApiProperty({
    description: 'Risk ID',
    example: 'rsk_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Risk title',
    example: 'Data breach vulnerability in user authentication system',
  })
  title: string;

  @ApiProperty({
    description: 'Detailed description of the risk',
    example:
      'Weak password requirements could lead to unauthorized access to user accounts',
  })
  description: string;

  @ApiProperty({
    description: 'Risk category',
    enum: RiskCategory,
    example: RiskCategory.technology,
  })
  category: RiskCategory;

  @ApiProperty({
    description: 'Department responsible for the risk',
    enum: Departments,
    nullable: true,
    example: Departments.it,
  })
  department: Departments | null;

  @ApiProperty({
    description: 'Current status of the risk',
    enum: RiskStatus,
    example: RiskStatus.open,
  })
  status: RiskStatus;

  @ApiProperty({
    description: 'Likelihood of the risk occurring',
    enum: Likelihood,
    example: Likelihood.possible,
  })
  likelihood: Likelihood;

  @ApiProperty({
    description: 'Impact if the risk materializes',
    enum: Impact,
    example: Impact.major,
  })
  impact: Impact;

  @ApiProperty({
    description: 'Residual likelihood after treatment',
    enum: Likelihood,
    example: Likelihood.unlikely,
  })
  residualLikelihood: Likelihood;

  @ApiProperty({
    description: 'Residual impact after treatment',
    enum: Impact,
    example: Impact.minor,
  })
  residualImpact: Impact;

  @ApiProperty({
    description: 'Description of the treatment strategy',
    nullable: true,
    example:
      'Implement multi-factor authentication and strengthen password requirements',
  })
  treatmentStrategyDescription: string | null;

  @ApiProperty({
    description: 'Risk treatment strategy',
    enum: RiskTreatmentType,
    example: RiskTreatmentType.mitigate,
  })
  treatmentStrategy: RiskTreatmentType;

  @ApiProperty({
    description: 'Organization ID',
    example: 'org_abc123def456',
  })
  organizationId: string;

  @ApiProperty({
    description: 'When the risk was created',
    type: String,
    format: 'date-time',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the risk was last updated',
    type: String,
    format: 'date-time',
    example: '2024-01-16T14:45:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'ID of the user assigned to this risk',
    example: 'usr_123abc456def',
    nullable: true,
  })
  assigneeId: string | null;
}
