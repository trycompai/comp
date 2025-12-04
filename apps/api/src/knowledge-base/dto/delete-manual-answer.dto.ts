import { IsString } from 'class-validator';

export class DeleteManualAnswerDto {
  @IsString()
  organizationId!: string;
}
