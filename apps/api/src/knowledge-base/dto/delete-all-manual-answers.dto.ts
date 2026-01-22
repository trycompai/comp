import { IsString } from 'class-validator';

export class DeleteAllManualAnswersDto {
  @IsString()
  organizationId!: string;
}
