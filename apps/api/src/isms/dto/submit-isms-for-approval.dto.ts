import { IsString } from 'class-validator';

export class SubmitIsmsForApprovalDto {
  @IsString()
  approverId!: string;
}
