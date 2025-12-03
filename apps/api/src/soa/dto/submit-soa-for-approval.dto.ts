import { IsString } from 'class-validator';

export class SubmitSOAForApprovalDto {
  @IsString()
  organizationId!: string;

  @IsString()
  documentId!: string;

  @IsString()
  approverId!: string;
}
