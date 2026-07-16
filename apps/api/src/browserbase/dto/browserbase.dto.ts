import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { TaskFrequency } from '@db';
import { IsSafeUrl } from '../validators/url-safety.validator';

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
  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsSafeUrl({ message: 'The provided URL is not allowed.' })
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
  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsSafeUrl({ message: 'The provided URL is not allowed.' })
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

export class AuthStatusResponseDto {
  @ApiProperty()
  isLoggedIn: boolean;

  @ApiPropertyOptional()
  username?: string;
}

// ===== Login analysis DTOs =====

export class AnalyzeLoginDto {
  @ApiProperty({ description: 'Vendor sign-in URL to analyze' })
  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsSafeUrl({ message: 'The provided URL is not allowed.' })
  @IsString()
  @IsNotEmpty()
  url: string;
}

export class LoginRecommendationDto {
  @ApiProperty({ enum: ['ready', 'works_with_checkins', 'manual'] })
  category: string;

  @ApiProperty()
  headline: string;

  @ApiProperty()
  detail: string;
}

export class AnalyzeLoginResponseDto {
  @ApiProperty({
    description: 'Trigger.dev run id for the background analysis',
  })
  runId: string;

  @ApiProperty({ description: 'Public access token to subscribe to the run' })
  publicAccessToken: string;
}

export class LoginAnalysisResponseDto {
  @ApiProperty()
  reachable: boolean;

  @ApiProperty({ type: [String] })
  detectedMethods: string[];

  @ApiProperty({ enum: ['email', 'username', 'either', 'unknown'] })
  identifierType: string;

  @ApiProperty({ type: [Object] })
  extraFields: { label: string }[];

  @ApiProperty({ type: () => LoginRecommendationDto })
  recommendation: LoginRecommendationDto;
}

// ===== Auth Profile DTOs =====

export class ResolveAuthProfileDto {
  @ApiProperty({
    description: 'Website URL to normalize into an auth profile hostname',
  })
  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsSafeUrl({ message: 'The provided URL is not allowed.' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({ description: 'Human-readable profile name' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Login identity label, such as a service account email',
  })
  @IsString()
  @IsOptional()
  loginIdentity?: string;

  @ApiPropertyOptional({ description: 'External vault provider name' })
  @IsString()
  @IsOptional()
  vaultProvider?: string;

  @ApiPropertyOptional({ description: 'External vault item reference' })
  @IsString()
  @IsOptional()
  vaultExternalItemRef?: string;

  @ApiPropertyOptional({ description: 'External vault connection ID' })
  @IsString()
  @IsOptional()
  vaultConnectionId?: string;
}

export class VerifyAuthProfileSessionDto {
  @ApiProperty({ description: 'Browserbase session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'URL to verify authentication on' })
  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsSafeUrl({ message: 'The provided URL is not allowed.' })
  @IsString()
  @IsNotEmpty()
  url: string;
}

export class UpdateAuthProfileDto {
  @ApiPropertyOptional({ description: 'Display name for the connection' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({
    description:
      'Sign-in URL. Changing to a different hostname signs the connection out.',
  })
  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsSafeUrl({ message: 'The provided URL is not allowed.' })
  @IsString()
  @IsOptional()
  url?: string;
}

export class MarkAuthProfileNeedsReauthDto {
  @ApiPropertyOptional({
    description: 'Reason the profile needs re-authentication',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class SignInAuthProfileDto {
  @ApiProperty({
    description: 'Vendor URL to sign in to (the profile hostname).',
  })
  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsSafeUrl({ message: 'The provided URL is not allowed.' })
  @IsString()
  @IsNotEmpty()
  url: string;
}

export class SignInAuthProfileResponseDto {
  @ApiProperty({
    description: 'Trigger.dev run id for the background automated sign-in',
  })
  runId: string;

  @ApiProperty({ description: 'Public access token to subscribe to the run' })
  publicAccessToken: string;

  @ApiProperty({
    description: 'Browserbase session id the sign-in runs on (for take-over)',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Live view URL so the user can watch and take over the sign-in',
  })
  liveViewUrl: string;
}

export class CredentialExtraFieldDto {
  @ApiProperty({ description: 'Field label as shown on the vendor login' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ description: 'Field value' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class StoreAuthProfileCredentialsDto {
  @ApiProperty({ description: 'Username or email for the vendor login' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Password for the vendor login' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    description:
      'Authenticator app setup key (TOTP secret or otpauth:// URI). When provided, one-time codes are generated for automated sign-in.',
  })
  @IsString()
  @IsOptional()
  totpSeed?: string;

  @ApiPropertyOptional({
    type: [CredentialExtraFieldDto],
    description: 'Extra site-specific fields (e.g. workspace, subdomain).',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CredentialExtraFieldDto)
  extraFields?: CredentialExtraFieldDto[];
}

export class BrowserAuthProfileResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  hostname: string;

  @ApiProperty()
  loginIdentity: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  contextId: string;

  @ApiProperty({ enum: ['unverified', 'verified', 'needs_reauth', 'blocked'] })
  status: string;

  @ApiPropertyOptional()
  lastVerifiedAt?: Date;

  @ApiPropertyOptional()
  lastAuthCheckUrl?: string;

  @ApiPropertyOptional()
  blockedReason?: string;

  @ApiPropertyOptional()
  vaultProvider?: string;

  @ApiPropertyOptional()
  vaultExternalItemRef?: string;

  @ApiPropertyOptional()
  vaultConnectionId?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ResolveAuthProfileResponseDto {
  @ApiProperty({ type: BrowserAuthProfileResponseDto })
  profile: BrowserAuthProfileResponseDto;

  @ApiProperty()
  isNew: boolean;
}

export class VerifyAuthProfileResponseDto {
  @ApiProperty({ type: BrowserAuthProfileResponseDto })
  profile: BrowserAuthProfileResponseDto;

  @ApiProperty({ type: () => AuthStatusResponseDto })
  auth: AuthStatusResponseDto;
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
  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsSafeUrl({ message: 'The provided URL is not allowed.' })
  @IsString()
  @IsNotEmpty()
  targetUrl: string;

  @ApiProperty({ description: 'Natural language instruction for navigation' })
  @IsString()
  @IsNotEmpty()
  instruction: string;

  @ApiPropertyOptional({
    description:
      'Optional natural-language criteria used to evaluate the automation result. When set, the run gets a pass/fail verdict.',
  })
  @IsString()
  @IsOptional()
  evaluationCriteria?: string;

  @ApiPropertyOptional({
    enum: TaskFrequency,
    description: 'Automation schedule cadence',
  })
  @IsEnum(TaskFrequency)
  @IsOptional()
  scheduleFrequency?: TaskFrequency;
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
  @IsUrl({}, { message: 'url must be a valid URL' })
  @IsSafeUrl({ message: 'The provided URL is not allowed.' })
  @IsString()
  @IsOptional()
  targetUrl?: string;

  @ApiPropertyOptional({ description: 'Natural language instruction' })
  @IsString()
  @IsOptional()
  instruction?: string;

  @ApiPropertyOptional({
    description:
      'Optional natural-language criteria used to evaluate the automation result. Pass an empty string to clear.',
  })
  @IsString()
  @IsOptional()
  evaluationCriteria?: string;

  @ApiPropertyOptional({ description: 'Whether automation is enabled' })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    enum: TaskFrequency,
    description: 'Automation schedule cadence',
  })
  @IsEnum(TaskFrequency)
  @IsOptional()
  scheduleFrequency?: TaskFrequency;
}

export class ExecuteAutomationSessionDto {
  @ApiProperty({ description: 'Browser automation run ID' })
  @IsString()
  @IsNotEmpty()
  runId: string;

  @ApiProperty({ description: 'Browserbase session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
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

  @ApiPropertyOptional()
  profileId?: string;

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

  @ApiPropertyOptional()
  failureCode?: string;

  @ApiPropertyOptional()
  failureStage?: string;

  @ApiPropertyOptional()
  blockedReason?: string;

  @ApiPropertyOptional()
  finalUrl?: string;

  @ApiPropertyOptional()
  attemptCount?: number;

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

  @ApiPropertyOptional()
  evaluationStatus?: string;

  @ApiPropertyOptional()
  evaluationReason?: string;

  @ApiPropertyOptional()
  failureCode?: string;

  @ApiPropertyOptional()
  failureStage?: string;

  @ApiPropertyOptional()
  blockedReason?: string;
}

// ===== Instruction Test (coach loop) DTOs =====

export class TestInstructionDto {
  @ApiProperty({ description: 'URL the AI should start from' })
  @IsUrl({}, { message: 'targetUrl must be a valid URL' })
  @IsSafeUrl({ message: 'The provided URL is not allowed.' })
  @IsString()
  @IsNotEmpty()
  targetUrl: string;

  @ApiProperty({ description: 'Natural language instruction to test' })
  @IsString()
  @IsNotEmpty()
  instruction: string;

  @ApiPropertyOptional({
    description:
      'Optional pass/fail criteria. When set, the test run gets a verdict.',
  })
  @IsString()
  @IsOptional()
  evaluationCriteria?: string;

  @ApiPropertyOptional({ description: 'Connection (browser auth profile) to run under' })
  @IsString()
  @IsOptional()
  profileId?: string;

  @ApiPropertyOptional({ description: 'Task the instruction belongs to' })
  @IsString()
  @IsOptional()
  taskId?: string;
}

export class TestInstructionResponseDto {
  @ApiProperty({ description: 'Trigger.dev run id to subscribe to' })
  runId: string;

  @ApiProperty({ description: 'Public token for realtime subscription' })
  publicAccessToken: string;

  @ApiProperty({ description: 'Browserbase session id backing the live view' })
  sessionId: string;

  @ApiProperty({ description: 'Live view URL for watching the test run' })
  liveViewUrl: string;
}
