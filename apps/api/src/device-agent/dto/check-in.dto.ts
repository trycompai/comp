import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

class CheckDetailsDto {
  @IsString()
  @MaxLength(100)
  method: string;

  @IsString()
  @MaxLength(2000)
  raw: string;

  @IsString()
  @MaxLength(1000)
  message: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  exception?: string;
}

export class CheckResultDto {
  @IsEnum(['disk_encryption', 'antivirus', 'password_policy', 'screen_lock'])
  checkType: 'disk_encryption' | 'antivirus' | 'password_policy' | 'screen_lock';

  @IsBoolean()
  passed: boolean;

  @ValidateNested()
  @Type(() => CheckDetailsDto)
  @IsObject()
  @IsOptional()
  details?: CheckDetailsDto;

  @IsDateString()
  checkedAt: string;
}

export class CheckInDto {
  @IsString()
  @MinLength(1)
  deviceId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckResultDto)
  checks: CheckResultDto[];

  @IsString()
  @IsOptional()
  agentVersion?: string;
}
