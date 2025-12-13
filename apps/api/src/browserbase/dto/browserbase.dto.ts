import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

// ===== Session DTOs =====

export class CreateSessionDto {
  @ApiProperty({ description: 'Browserbase context ID' })
  @IsString()
  @IsNotEmpty()
  contextId: string;
}

export class NavigateToUrlDto {
  @ApiProperty({ description: 'Browserbase session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'URL to navigate to' })
  @IsString()
  @IsNotEmpty()
  url: string;
}

export class CheckAuthDto {
  @ApiProperty({ description: 'Browserbase session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'URL to check auth status on' })
  @IsString()
  @IsNotEmpty()
  url: string;
}

export class CloseSessionDto {
  @ApiProperty({ description: 'Browserbase session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

// ===== Browser Automation DTOs =====

export class CreateBrowserAutomationDto {
  @ApiProperty({ description: 'Task ID this automation belongs to' })
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ description: 'Automation name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Automation description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Target URL to start from' })
  @IsString()
  @IsNotEmpty()
  targetUrl: string;

  @ApiProperty({ description: 'Natural language instruction for navigation' })
  @IsString()
  @IsNotEmpty()
  instruction: string;

  @ApiPropertyOptional({ description: 'Cron schedule expression' })
  @IsString()
  @IsOptional()
  schedule?: string;
}

export class UpdateBrowserAutomationDto {
  @ApiPropertyOptional({ description: 'Automation name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Automation description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Target URL to start from' })
  @IsString()
  @IsOptional()
  targetUrl?: string;

  @ApiPropertyOptional({ description: 'Natural language instruction' })
  @IsString()
  @IsOptional()
  instruction?: string;

  @ApiPropertyOptional({ description: 'Cron schedule expression' })
  @IsString()
  @IsOptional()
  schedule?: string;

  @ApiPropertyOptional({ description: 'Whether automation is enabled' })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}

// ===== Response DTOs =====

export class ContextResponseDto {
  @ApiProperty()
  contextId: string;

  @ApiProperty()
  isNew: boolean;
}

export class SessionResponseDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  liveViewUrl: string;
}

export class AuthStatusResponseDto {
  @ApiProperty()
  isLoggedIn: boolean;

  @ApiPropertyOptional()
  username?: string;
}

export class BrowserAutomationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  taskId: string;

  @ApiProperty()
  targetUrl: string;

  @ApiProperty()
  instruction: string;

  @ApiProperty()
  isEnabled: boolean;

  @ApiPropertyOptional()
  schedule?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class BrowserAutomationRunResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  automationId: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  startedAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  durationMs?: number;

  @ApiPropertyOptional()
  screenshotUrl?: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiProperty()
  createdAt: Date;
}

export class RunAutomationResponseDto {
  @ApiProperty()
  runId: string;

  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  screenshotUrl?: string;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional()
  needsReauth?: boolean;
}
