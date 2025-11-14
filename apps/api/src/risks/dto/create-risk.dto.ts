import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import {
  RiskCategory,
  Departments,
  RiskStatus,
  Likelihood,
  Impact,
  RiskTreatmentType,
} from '@trycompai/db';

export class CreateRiskDto {
  @ApiProperty({
    description: 'Risk title',
    example: 'Data breach vulnerability in user authentication system',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the risk',
    example:
      'Weak password requirements could lead to unauthorized access to user accounts',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Risk category',
    enum: RiskCategory,
    example: RiskCategory.technology,
  })
  @IsEnum(RiskCategory)
  category: RiskCategory;

  @ApiProperty({
    description: 'Department responsible for the risk',
    enum: Departments,
    required: false,
    example: Departments.it,
  })
  @IsOptional()
  @IsEnum(Departments)
  department?: Departments;

  @ApiProperty({
    description: 'Current status of the risk',
    enum: RiskStatus,
    default: RiskStatus.open,
    example: RiskStatus.open,
  })
  @IsOptional()
  @IsEnum(RiskStatus)
  status?: RiskStatus;

  @ApiProperty({
    description: 'Likelihood of the risk occurring',
    enum: Likelihood,
    default: Likelihood.very_unlikely,
    example: Likelihood.possible,
  })
  @IsOptional()
  @IsEnum(Likelihood)
  likelihood?: Likelihood;

  @ApiProperty({
    description: 'Impact if the risk materializes',
    enum: Impact,
    default: Impact.insignificant,
    example: Impact.major,
  })
  @IsOptional()
  @IsEnum(Impact)
  impact?: Impact;

  @ApiProperty({
    description: 'Residual likelihood after treatment',
    enum: Likelihood,
    default: Likelihood.very_unlikely,
    example: Likelihood.unlikely,
  })
  @IsOptional()
  @IsEnum(Likelihood)
  residualLikelihood?: Likelihood;

  @ApiProperty({
    description: 'Residual impact after treatment',
    enum: Impact,
    default: Impact.insignificant,
    example: Impact.minor,
  })
  @IsOptional()
  @IsEnum(Impact)
  residualImpact?: Impact;

  @ApiProperty({
    description: 'Description of the treatment strategy',
    required: false,
    example:
      'Implement multi-factor authentication and strengthen password requirements',
  })
  @IsOptional()
  @IsString()
  treatmentStrategyDescription?: string;

  @ApiProperty({
    description: 'Risk treatment strategy',
    enum: RiskTreatmentType,
    default: RiskTreatmentType.accept,
    example: RiskTreatmentType.mitigate,
  })
  @IsOptional()
  @IsEnum(RiskTreatmentType)
  treatmentStrategy?: RiskTreatmentType;

  @ApiProperty({
    description: 'ID of the user assigned to this risk',
    required: false,
    example: 'mem_abc123def456',
  })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}
