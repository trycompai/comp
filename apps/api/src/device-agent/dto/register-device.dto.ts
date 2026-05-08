import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  hostname: string;

  @IsEnum(['macos', 'windows', 'linux'])
  platform: 'macos' | 'windows' | 'linux';

  @IsString()
  @MinLength(1)
  osVersion: string;

  @IsString()
  @MinLength(1)
  organizationId: string;

  @IsString()
  @IsOptional()
  serialNumber?: string;

  @IsString()
  @IsOptional()
  hardwareModel?: string;

  @IsString()
  @IsOptional()
  agentVersion?: string;
}
