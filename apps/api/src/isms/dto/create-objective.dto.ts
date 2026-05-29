import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { IsmsObjectiveStatus } from '@db';

const OBJECTIVE_STATUSES: IsmsObjectiveStatus[] = [
  'not_started',
  'on_track',
  'at_risk',
  'met',
];

export class CreateObjectiveDto {
  @IsString()
  objective!: string;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  ownerMemberId?: string;

  @IsOptional()
  @IsString()
  cadence?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  measurementMethod?: string;

  @IsOptional()
  @IsIn(OBJECTIVE_STATUSES)
  status?: IsmsObjectiveStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
