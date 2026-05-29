import { IsString } from 'class-validator';

export class GenerateAllDto {
  @IsString()
  frameworkId!: string;
}
