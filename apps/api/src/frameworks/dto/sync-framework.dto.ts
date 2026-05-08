import { IsString, Matches } from 'class-validator';

export class SyncFrameworkDto {
  @IsString()
  @Matches(/^fvr_/)
  targetVersionId!: string;
}
