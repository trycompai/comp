import type { AwsCredentialIdentity } from '@aws-sdk/types';
import type { AwsCommandStep } from './ai-remediation.prompt';

import * as s3 from '@aws-sdk/client-s3';
import * as dynamodb from '@aws-sdk/client-dynamodb';
import * as kinesis from '@aws-sdk/client-kinesis';
import * as redshift from '@aws-sdk/client-redshift';
import * as backup from '@aws-sdk/client-backup';
import * as ecr from '@aws-sdk/client-ecr';
import * as glue from '@aws-sdk/client-glue';
import * as athena from '@aws-sdk/client-athena';
import * as opensearch from '@aws-sdk/client-opensearch';
import * as secretsManager from '@aws-sdk/client-secrets-manager';
import * as kms from '@aws-sdk/client-kms';
import * as cloudtrail from '@aws-sdk/client-cloudtrail';
import * as guardduty from '@aws-sdk/client-guardduty';
import * as configService from '@aws-sdk/client-config-service';
import * as iam from '@aws-sdk/client-iam';
import * as sts from '@aws-sdk/client-sts';
import * as inspector2 from '@aws-sdk/client-inspector2';
import * as macie2 from '@aws-sdk/client-macie2';
import * as cognito from '@aws-sdk/client-cognito-identity-provider';
import * as shield from '@aws-sdk/client-shield';
import * as wafv2 from '@aws-sdk/client-wafv2';
import * as acm from '@aws-sdk/client-acm';
import * as cwLogs from '@aws-sdk/client-cloudwatch-logs';
import * as cloudwatch from '@aws-sdk/client-cloudwatch';
import * as sns from '@aws-sdk/client-sns';
import * as ec2 from '@aws-sdk/client-ec2';
import * as lambda from '@aws-sdk/client-lambda';
import * as eks from '@aws-sdk/client-eks';
import * as emr from '@aws-sdk/client-emr';
import * as codebuild from '@aws-sdk/client-codebuild';
import * as elasticBeanstalk from '@aws-sdk/client-elastic-beanstalk';
import * as sfn from '@aws-sdk/client-sfn';
import * as elbv2 from '@aws-sdk/client-elastic-load-balancing-v2';
import * as cloudfront from '@aws-sdk/client-cloudfront';
import * as rds from '@aws-sdk/client-rds';
import * as apigw from '@aws-sdk/client-apigatewayv2';
import * as route53 from '@aws-sdk/client-route-53';
import * as networkFirewall from '@aws-sdk/client-network-firewall';
import * as transfer from '@aws-sdk/client-transfer';
import * as sqs from '@aws-sdk/client-sqs';
import * as eventbridge from '@aws-sdk/client-eventbridge';
import * as ssm from '@aws-sdk/client-ssm';
import * as kafka from '@aws-sdk/client-kafka';
import * as sagemaker from '@aws-sdk/client-sagemaker';
import * as efs from '@aws-sdk/client-efs';
import * as elasticache from '@aws-sdk/client-elasticache';

type SdkModule = Record<string, any>;

/** Static map of service name → SDK module. Includes common aliases AI might use. */
const SDK_MODULES: Record<string, SdkModule> = {
  s3: s3,
  dynamodb: dynamodb,
  kinesis: kinesis,
  redshift: redshift,
  backup: backup,
  ecr: ecr,
  glue: glue,
  athena: athena,
  opensearch: opensearch,
  'secrets-manager': secretsManager,
  kms: kms,
  cloudtrail: cloudtrail,
  guardduty: guardduty,
  'config-service': configService,
  iam: iam,
  sts: sts,
  inspector2: inspector2,
  macie2: macie2,
  'cognito-identity-provider': cognito,
  shield: shield,
  wafv2: wafv2,
  acm: acm,
  'cloudwatch-logs': cwLogs,
  cloudwatch: cloudwatch,
  sns: sns,
  ec2: ec2,
  lambda: lambda,
  eks: eks,
  emr: emr,
  codebuild: codebuild,
  'elastic-beanstalk': elasticBeanstalk,
  sfn: sfn,
  'elastic-load-balancing-v2': elbv2,
  cloudfront: cloudfront,
  rds: rds,
  apigatewayv2: apigw,
  'route-53': route53,
  'network-firewall': networkFirewall,
  transfer: transfer,
  sqs: sqs,
  eventbridge: eventbridge,
  ssm: ssm,
  kafka: kafka,
  sagemaker: sagemaker,
  efs: efs,
  elasticache: elasticache,
  // Common aliases AI might use
  logs: cwLogs,
  config: configService,
  cognito: cognito,
  waf: wafv2,
  route53: route53,
  'step-functions': sfn,
  elb: elbv2,
  elbv2: elbv2,
  apigateway: apigw,
  msk: kafka,
  inspector: inspector2,
  macie: macie2,
  secretsmanager: secretsManager,
};

/** Commands that are too dangerous or not allowed to execute. */
const BLOCKED_COMMANDS = new Set([
  // Destructive
  'DeleteBucketCommand',
  'DeleteTableCommand',
  'DeleteDBInstanceCommand',
  'DeleteDBClusterCommand',
  'DeleteFileSystemCommand',
  'TerminateInstancesCommand',
  'DeleteClusterCommand',
  'DeleteStackCommand',
  'DeleteVpcCommand',
  'DeleteSubnetCommand',
  'DeleteUserCommand',
  'DeleteRoleCommand',
  // AttachRolePolicy blocked — use PutRolePolicy (inline) instead
  'AttachRolePolicyCommand',
]);

/** Param names that AWS expects as JSON strings, not objects. */
const JSON_STRING_PARAMS = new Set([
  'Content',
  'PolicyDocument',
  'AssumeRolePolicyDocument',
  'Policy',
  'TrustPolicy',
  'ResourcePolicy',
  'Configuration',
  'Definition',
]);

/**
 * Universal pre-execution param normalisation.
 * Fixes common AI mistakes without per-command logic.
 */
function normaliseInputParams(
  input: Record<string, unknown>,
  command: string,
  region: string,
): void {
  for (const [key, value] of Object.entries(input)) {
    // Rule 1: Stringify any object param that AWS expects as a JSON string
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      JSON_STRING_PARAMS.has(key)
    ) {
      input[key] = JSON.stringify(value);
    }
  }

  // Rule 2: S3 CreateBucket needs LocationConstraint for non-us-east-1
  if (command === 'CreateBucketCommand') {
    if (input.Bucket) {
      input.Bucket = String(input.Bucket).toLowerCase().replace(/_/g, '-');
    }
    if (region !== 'us-east-1' && !input.CreateBucketConfiguration) {
      input.CreateBucketConfiguration = { LocationConstraint: region };
    }
  }

  // Rule 3: CloudTrail trails should default to multi-region + validation
  if (command === 'CreateTrailCommand') {
    if (!input.IsMultiRegionTrail) input.IsMultiRegionTrail = true;
    if (!input.EnableLogFileValidation) input.EnableLogFileValidation = true;
  }
}

/**
 * Universal send-with-retry. Handles three recoverable error classes:
 *  1. Validation errors  → auto-fix the offending param, retry once
 *  2. Throttling          → exponential backoff, up to 3 retries
 *  3. IAM propagation     → wait and retry (roles/policies take seconds to propagate)
 * Everything else is surfaced immediately.
 */

async function sendWithAutoRetry(
  client: any,

  CommandClass: any,
  input: Record<string, unknown>,
  command: string,
  service: string,
): Promise<Record<string, unknown>> {
  const MAX_ATTEMPTS = 4; // 1 initial + up to 3 retries
  let validationFixed = false;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const result = await client.send(new CommandClass(input));

      // After creating an IAM role, wait for propagation
      if (
        command === 'CreateRoleCommand' ||
        command === 'PutRolePolicyCommand'
      ) {
        await new Promise((r) => setTimeout(r, 5000));
      }

      return (result ?? {}) as Record<string, unknown>;
    } catch (err) {
      const awsErr = err as {
        name?: string;
        message?: string;
        Code?: string;
        $metadata?: { httpStatusCode?: number };
      };
      const errName = awsErr.name ?? '';
      const errMsg =
        awsErr.message ||
        awsErr.Code ||
        `${errName} (HTTP ${awsErr.$metadata?.httpStatusCode ?? 'unknown'})`;

      console.error(
        `AWS Command Error [${service}:${command}] attempt ${attempt + 1}:`,
        errName,
        errMsg,
      );

      // ── Idempotent "already exists" → treat as success ──
      if (
        errName === 'ResourceAlreadyExistsException' ||
        errName === 'DuplicateDocumentContent' ||
        errName === 'DuplicateDocumentVersionName' ||
        errMsg.includes('already exists') ||
        errMsg.includes('AlreadyExists') ||
        errMsg.includes('same metadata and content') ||
        errMsg.includes('DuplicateDocument')
      ) {
        return { _alreadyExists: true, message: errMsg };
      }

      // ── Throttle / rate limit → backoff and retry ──
      if (isThrottleError(errName, errMsg) && attempt < MAX_ATTEMPTS - 1) {
        const delay = Math.min(1000 * 2 ** attempt, 8000); // 1s, 2s, 4s, 8s
        console.log(
          `Throttled on ${service}:${command}, retrying in ${delay}ms`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // ── Validation error → auto-fix param and retry once ──
      if (!validationFixed && isValidationError(errName, errMsg)) {
        const fixed = tryAutoFixValidationError(input, errMsg);
        if (fixed) {
          console.log(
            `Auto-fixed validation error, retrying ${service}:${command}`,
          );
          validationFixed = true;
          continue;
        }
      }

      // ── Not found → clear message ──
      if (
        errName === 'ServiceSettingNotFound' ||
        errName === 'ResourceNotFoundException' ||
        errName === 'NotFoundException' ||
        errName === 'InvalidDocument' ||
        errName === 'NoSuchEntity' ||
        errName === 'NoSuchBucket' ||
        errName === 'DetectorNotFoundException' ||
        errMsg.includes('does not exist') ||
        errMsg.includes('not found')
      ) {
        throw new Error(
          `${service}:${command} failed: target resource not found (${errName}). ${errMsg}`,
        );
      }

      // ── Unknown / unrecoverable ──
      if (!errMsg || errMsg === 'Unknown' || errMsg === 'UnknownError') {
        throw new Error(
          `${service}:${command} failed with ${errName || 'unknown error'} (HTTP ${awsErr.$metadata?.httpStatusCode ?? '?'}). Check IAM permissions and input parameters.`,
        );
      }
      throw err;
    }
  }
  throw new Error(
    `${service}:${command} failed after ${MAX_ATTEMPTS} attempts`,
  );
}

function isThrottleError(errName: string, errMsg: string): boolean {
  return (
    errName === 'Throttling' ||
    errName === 'ThrottlingException' ||
    errName === 'TooManyRequestsException' ||
    errName === 'RequestLimitExceeded' ||
    errMsg.includes('Rate exceeded') ||
    errMsg.includes('Throttling') ||
    errMsg.includes('Too Many Requests')
  );
}

function isValidationError(errName: string, errMsg: string): boolean {
  return (
    errName === 'ValidationException' ||
    errName === 'InvalidParameterValue' ||
    errName === 'InvalidParameterValueException' ||
    errMsg.includes('validation error') ||
    errMsg.includes('failed to satisfy constraint')
  );
}

/**
 * Parse the AWS validation error, fix the offending param, return true if fixed.
 * AWS error format: "Value at 'fieldName' failed to satisfy constraint: ..."
 *
 * Key subtlety: AWS errors use camelCase ('documentVersion') but SDK params
 * use PascalCase ('DocumentVersion'). We match case-insensitively.
 */
function tryAutoFixValidationError(
  input: Record<string, unknown>,
  errMsg: string,
): boolean {
  // Extract field name from error (camelCase)
  const fieldMatch = errMsg.match(/Value at '(\w+)'/i);
  if (!fieldMatch?.[1]) return false;

  const errorField = fieldMatch[1];

  // Find the actual key in input (case-insensitive match)
  const inputKey = Object.keys(input).find(
    (k) => k.toLowerCase() === errorField.toLowerCase(),
  );
  if (!inputKey) return false;

  const value = input[inputKey];

  // Fix 1: Regex constraint (version numbers, IDs, etc.)
  //   → remove the param so AWS uses its default
  if (errMsg.includes('regular expression pattern')) {
    delete input[inputKey];
    return true;
  }

  // Fix 2: Object instead of string → stringify
  if (value !== null && typeof value === 'object') {
    input[inputKey] = JSON.stringify(value);
    return true;
  }

  // Fix 3: Length constraint → truncate
  const lengthMatch = errMsg.match(/length less than or equal to (\d+)/);
  if (lengthMatch && typeof value === 'string') {
    input[inputKey] = value.slice(0, Number(lengthMatch[1]));
    return true;
  }

  return false;
}

/**
 * Validate all steps in a plan BEFORE executing anything.
 * Catches: unknown services, missing commands, blocked commands, placeholder values.
 * Returns list of errors. Empty = valid.
 */
export function validatePlanSteps(steps: AwsCommandStep[]): string[] {
  const errors: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const prefix = `Step ${i + 1} (${step.command})`;

    // Check service exists
    if (!SDK_MODULES[step.service]) {
      errors.push(`${prefix}: Unknown service "${step.service}"`);
      continue;
    }

    // Check command exists in module (with fuzzy match for AI mistakes)
    const mod = SDK_MODULES[step.service];
    let cmdExists =
      mod[step.command] && typeof mod[step.command] === 'function';
    if (!cmdExists) {
      const cmdBase = step.command.replace('Command', '');
      const fuzzy = Object.keys(mod).find((k) => {
        if (!k.endsWith('Command') || typeof mod[k] !== 'function')
          return false;
        const kBase = k.replace('Command', '');
        return (
          kBase.includes(cmdBase) ||
          cmdBase.includes(kBase) ||
          kBase.replace('Bucket', '') === cmdBase.replace('Bucket', '')
        );
      });
      cmdExists = Boolean(fuzzy);
    }
    if (!cmdExists) {
      errors.push(
        `${prefix}: Command "${step.command}" not found in @aws-sdk/client-${step.service}`,
      );
      continue;
    }

    // Check command name format
    if (!step.command.endsWith('Command')) {
      errors.push(`${prefix}: Command name must end with "Command"`);
    }

    // Check blocked
    if (BLOCKED_COMMANDS.has(step.command)) {
      errors.push(`${prefix}: Command is blocked for safety`);
    }

    // Check for placeholder values in params
    const paramStr = JSON.stringify(step.params);
    const placeholders = paramStr.match(/\{\{[\w]+\}\}|<[A-Z_]+>/g);
    if (placeholders) {
      errors.push(
        `${prefix}: Contains placeholder values: ${placeholders.join(', ')}`,
      );
    }
  }

  return errors;
}

export interface StepResult {
  step: AwsCommandStep;
  output: Record<string, unknown>;
}

export interface PlanExecutionResult {
  results: StepResult[];
  error?: { stepIndex: number; message: string; step: AwsCommandStep };
}

/**
 * Execute a single AWS SDK v3 command.
 * Uses static imports — no dynamic require, no version mismatches.
 */
export async function executeAwsCommand(params: {
  service: string;
  command: string;
  input: Record<string, unknown>;
  credentials: AwsCredentialIdentity;
  region: string;
  isRollback?: boolean;
}): Promise<Record<string, unknown>> {
  const { service, command, input, credentials, region, isRollback } = params;

  const mod = SDK_MODULES[service];
  if (!mod) {
    throw new Error(`Service "${service}" is not supported`);
  }

  // Block dangerous commands — unless this is a rollback (rollback needs Delete to undo)
  if (BLOCKED_COMMANDS.has(command) && !isRollback) {
    throw new Error(`Command "${command}" is blocked for safety`);
  }

  if (!command.endsWith('Command')) {
    throw new Error(`Invalid command name "${command}"`);
  }

  // ─── Universal param normalisation ──────────────────────────────────
  // Instead of per-command hacks, apply two universal rules that cover
  // every current and future AWS command the AI might generate.

  normaliseInputParams(input, command, region);

  // Try exact command name first, then fuzzy match if not found
  let CommandClass = mod[command];
  if (!CommandClass || typeof CommandClass !== 'function') {
    // AI sometimes generates wrong command names — try to find the closest match
    const cmdBase = command.replace('Command', '');
    const match = Object.keys(mod).find((k) => {
      if (!k.endsWith('Command') || typeof mod[k] !== 'function') return false;
      const kBase = k.replace('Command', '');
      // Check if one contains the other (e.g., PutBucketPublicAccessBlock vs PutPublicAccessBlock)
      return (
        kBase.includes(cmdBase) ||
        cmdBase.includes(kBase) ||
        kBase.replace('Bucket', '') === cmdBase.replace('Bucket', '')
      );
    });
    if (match) {
      // Re-check blocked commands against the resolved name
      if (BLOCKED_COMMANDS.has(match) && !isRollback) {
        throw new Error(`Command "${match}" is blocked for safety`);
      }
      CommandClass = mod[match];
    }
  }
  if (!CommandClass || typeof CommandClass !== 'function') {
    throw new Error(
      `Command "${command}" not found in @aws-sdk/client-${service}`,
    );
  }

  // Find the client class from the same module (skip internal __Client)
  const clientKey = Object.keys(mod).find(
    (k) =>
      k.endsWith('Client') &&
      k !== 'Client' &&
      !k.startsWith('_') &&
      typeof mod[k] === 'function' &&
      !k.includes('Command') &&
      !k.includes('Exception'),
  );
  if (!clientKey) {
    throw new Error(`No client found in @aws-sdk/client-${service}`);
  }

  const client = new mod[clientKey]({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  });

  try {
    return await sendWithAutoRetry(
      client,
      CommandClass,
      input,
      command,
      service,
    );
  } finally {
    client.destroy?.();
  }
}

/**
 * Execute a sequence of steps. Stops on first error.
 * When `autoRollbackSteps` is provided and a step fails, automatically
 * undoes completed steps in reverse order (best-effort).
 * Convention: rollbackSteps[i] undoes fixSteps[i].
 */
export async function executePlanSteps(params: {
  steps: AwsCommandStep[];
  credentials: AwsCredentialIdentity;
  region: string;
  isRollback?: boolean;
  autoRollbackSteps?: AwsCommandStep[];
}): Promise<PlanExecutionResult> {
  const results: StepResult[] = [];

  for (let i = 0; i < params.steps.length; i++) {
    const step = params.steps[i];
    try {
      const output = await executeAwsCommand({
        service: step.service,
        command: step.command,
        input: structuredClone(step.params),
        credentials: params.credentials,
        region: params.region,
        isRollback: params.isRollback,
      });
      results.push({ step, output });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // If a prior step was a no-op (already exists / duplicate content),
      // this step may depend on output from that no-op (e.g., a version number).
      // Skip it instead of failing the entire execution — the infra is already
      // in the desired state. This is universal: works for any service.
      const hasPriorNoOp = results.some(
        (r) => r.output._alreadyExists || r.output._skipped,
      );
      if (
        hasPriorNoOp &&
        (message.includes('validation error') ||
          message.includes('failed to satisfy constraint'))
      ) {
        console.log(
          `Skipping step ${i + 1} (${step.command}) — prior step was no-op, this step likely depends on its output`,
        );
        results.push({ step, output: { _skipped: true, reason: message } });
        continue;
      }

      // Auto-rollback completed steps if rollback steps were provided
      if (params.autoRollbackSteps && results.length > 0) {
        const rollbackSlice = params.autoRollbackSteps
          .slice(0, results.length)
          .reverse();
        for (const rbStep of rollbackSlice) {
          try {
            await executeAwsCommand({
              service: rbStep.service,
              command: rbStep.command,
              input: structuredClone(rbStep.params),
              credentials: params.credentials,
              region: params.region,
              isRollback: true,
            });
          } catch {
            // Best-effort rollback — don't mask original error
          }
        }
      }

      return { results, error: { stepIndex: i, message, step } };
    }
  }

  return { results };
}
