import { IsString, MinLength } from 'class-validator';

export class ExchangeCodeDto {
  @IsString()
  @MinLength(1)
  code: string;
}
