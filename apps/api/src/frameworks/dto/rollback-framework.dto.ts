import { IsString, Matches } from 'class-validator';

export class RollbackFrameworkDto {
  @IsString()
  @Matches(/^fso_/)
  syncOperationId!: string;
}
