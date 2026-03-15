import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class AuthCodeDto {
  @IsInt()
  @Min(1)
  @Max(65535)
  callback_port: number;

  @IsString()
  @MinLength(1)
  state: string;
}
