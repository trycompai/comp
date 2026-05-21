import { Command } from 'commander';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { z } from 'zod';

const execFileAsync = promisify(execFile);

type JsonObject = Record<string, unknown>;

interface GlobalOptions {
  apiUrl?: string;
  apiKey?: string;
}

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  apiUrl?: string;
  apiKey?: string;
  bootstrapToken?: string;
}

class CliError extends Error {
  constructor(
    message: string,
    readonly code = 'CLI_ERROR',
    readonly details?: unknown,
  ) {
    super(message);
  }
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

const program = new Command();

program
  .name('compctl')
  .description('Agent-friendly Comp AI CLI for SOC 2 readiness workflows')
  .version('0.1.0')
  .option('--api-url <url>', 'Comp API URL', process.env.COMP_API_URL ?? 'http://localhost:3333')
  .option('--api-key <key>', 'Comp API key', process.env.COMP_API_KEY);

program
  .command('register')
  .description('Register or reuse a client organization and mint an API key')
  .requiredOption('--company-name <name>', 'Company/client name')
  .requiredOption('--owner-email <email>', 'Owner email for the generated organization')
  .option('--owner-name <name>', 'Owner display name', 'Comp AI Agent')
  .option('--website <url>', 'Company website')
  .option('--framework <name>', 'Readiness framework name', 'SOC 2 Type 1')
  .option(
    '--bootstrap-token <token>',
    'Comp bootstrap token',
    process.env.COMPCTL_BOOTSTRAP_TOKEN ?? process.env.SERVICE_TOKEN_COMPCTL,
  )
  .action((options, command) =>
    run(async () => {
      const globals = command.optsWithGlobals() as GlobalOptions;
      if (!options.bootstrapToken) {
        throw new CliError(
          'Missing bootstrap token. Set COMPCTL_BOOTSTRAP_TOKEN or pass --bootstrap-token.',
          'MISSING_BOOTSTRAP_TOKEN',
        );
      }
      progress('Registering Comp AI client organization');
      return apiRequest('/v1/readiness/register', {
        method: 'POST',
        apiUrl: globals.apiUrl,
        bootstrapToken: options.bootstrapToken,
        body: {
          companyName: options.companyName,
          ownerEmail: options.ownerEmail,
          ownerName: options.ownerName,
          website: options.website,
          framework: options.framework,
        },
      });
    }),
  );

const repo = program.command('repo').description('Repository inspection helpers');

repo
  .command('inspect')
  .description('Inspect a customer repo tree without modifying it')
  .requiredOption('--repo <path>', 'Repository root or parent folder')
  .option('--out <path>', 'Optional path to write the JSON context')
  .action((options) =>
    run(async () => {
      progress(`Inspecting repository context under ${options.repo}`);
      const context = await inspectRepo(options.repo);
      if (options.out) {
        await writeFile(resolve(options.out), JSON.stringify(context, null, 2));
        progress(`Wrote repository context to ${resolve(options.out)}`);
      }
      return context;
    }),
  );

const readiness = program
  .command('readiness')
  .description('SOC 2 readiness commands');

readiness
  .command('status')
  .description('Read Comp AI readiness status')
  .action((options, command) =>
    run(async () => {
      const globals = command.optsWithGlobals() as GlobalOptions;
      progress('Reading readiness status from Comp AI');
      return apiRequest('/v1/readiness/status', {
        apiUrl: globals.apiUrl,
        apiKey: requireApiKey(globals),
      });
    }),
  );

readiness
  .command('apply')
  .description('Apply repo/vendor/risk context and mark readiness progress in Comp AI')
  .option('--repo <path>', 'Repository root or parent folder to inspect')
  .option('--repo-context-file <path>', 'Precomputed repo context JSON')
  .option('--target-completion <ratio>', 'Target task completion ratio', '0.9')
  .action((options, command) =>
    run(async () => {
      const globals = command.optsWithGlobals() as GlobalOptions;
      const targetCompletion = Number(options.targetCompletion);
      if (!Number.isFinite(targetCompletion) || targetCompletion < 0 || targetCompletion > 1) {
        throw new CliError('--target-completion must be a number between 0 and 1', 'INVALID_TARGET_COMPLETION');
      }

      const repoContext = await loadRepoContext(options.repo, options.repoContextFile);
      const vendors = Array.isArray(repoContext?.vendors) ? repoContext.vendors : [];
      const risks = Array.isArray(repoContext?.risks) ? repoContext.risks : [];

      progress('Applying readiness context to Comp AI');
      return apiRequest('/v1/readiness/apply', {
        method: 'POST',
        apiUrl: globals.apiUrl,
        apiKey: requireApiKey(globals),
        body: {
          targetCompletion,
          repoContext,
          vendors,
          risks,
          markOnboardingComplete: true,
        },
      });
    }),
  );

const aws = program.command('aws').description('AWS connection and scan commands');

aws
  .command('setup-role')
  .description('Create or update the read-only Comp AI IAM role using direct AWS CLI')
  .requiredOption('--external-id <id>', 'External ID, usually the Comp organization ID')
  .requiredOption('--principal-arn <arn>', 'Comp role assumer principal ARN')
  .option('--profile <profile>', 'AWS CLI profile', process.env.AWS_PROFILE)
  .option('--region <region>', 'AWS region for AWS CLI calls', process.env.AWS_REGION ?? 'us-east-1')
  .option('--role-name <name>', 'IAM role name', 'CompAI-Auditor')
  .option('--dry-run', 'Return the planned AWS CLI actions without executing')
  .action((options) =>
    run(async () => {
      progress('Setting up Comp AI AWS IAM role with direct AWS CLI');
      return setupAwsRole({
        externalId: options.externalId,
        principalArn: options.principalArn,
        profile: options.profile,
        region: options.region,
        roleName: options.roleName,
        dryRun: options.dryRun === true,
      });
    }),
  );

aws
  .command('connect')
  .description('Create or reuse an AWS integration connection in Comp AI')
  .requiredOption('--role-arn <arn>', 'AWS IAM role ARN created by aws setup-role')
  .option('--external-id <id>', 'External ID; defaults to current Comp organization ID')
  .option('--regions <regions>', 'Comma-separated regions to scan', 'eu-central-1')
  .option('--connection-name <name>', 'Comp connection name', 'Helvetia AWS')
  .action((options, command) =>
    run(async () => {
      const globals = command.optsWithGlobals() as GlobalOptions;
      const apiKey = requireApiKey(globals);
      const status = await apiRequest('/v1/readiness/status', {
        apiUrl: globals.apiUrl,
        apiKey,
      });
      const organizationId =
        options.externalId ??
        (unwrapData(status)?.organization as { id?: string } | undefined)?.id;
      if (!organizationId) {
        throw new CliError('Could not infer organization ID. Pass --external-id.', 'MISSING_EXTERNAL_ID');
      }

      const regions = parseCsv(options.regions);
      progress('Creating or reusing AWS connection in Comp AI');
      return connectAws({
        apiUrl: globals.apiUrl,
        apiKey,
        roleArn: options.roleArn,
        externalId: organizationId,
        regions,
        connectionName: options.connectionName,
      });
    }),
  );

aws
  .command('scan')
  .description('Run a Comp AI cloud scan for an AWS connection')
  .option('--connection-id <id>', 'AWS connection ID to scan')
  .action((options, command) =>
    run(async () => {
      const globals = command.optsWithGlobals() as GlobalOptions;
      const apiKey = requireApiKey(globals);
      progress('Running Comp AI AWS cloud scan');
      return scanAws({
        apiUrl: globals.apiUrl,
        apiKey,
        connectionId: options.connectionId,
      });
    }),
  );

aws
  .command('findings')
  .description('Read cloud security findings from Comp AI')
  .action((options, command) =>
    run(async () => {
      const globals = command.optsWithGlobals() as GlobalOptions;
      progress('Reading cloud findings from Comp AI');
      return apiRequest('/v1/cloud-security/findings', {
        apiUrl: globals.apiUrl,
        apiKey: requireApiKey(globals),
      });
    }),
  );

async function run(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    outputSuccess(data);
  } catch (error) {
    outputError(error);
    process.exitCode = 1;
  }
}

async function apiRequest(path: string, options: ApiRequestOptions = {}) {
  const apiUrl = (options.apiUrl ?? process.env.COMP_API_URL ?? 'http://localhost:3333').replace(/\/$/, '');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (options.apiKey) headers['X-API-Key'] = options.apiKey;
  if (options.bootstrapToken) headers['X-Compctl-Token'] = options.bootstrapToken;

  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  const body = text ? safeJson(text) : null;
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: unknown }).message)
        : response.statusText;
    throw new ApiError(response.status, message, body);
  }
  return body;
}

function requireApiKey(globals: GlobalOptions): string {
  const apiKey = globals.apiKey ?? process.env.COMP_API_KEY;
  if (!apiKey) {
    throw new CliError('Missing API key. Set COMP_API_KEY or pass --api-key.', 'MISSING_API_KEY');
  }
  return apiKey;
}

function unwrapData(value: unknown): JsonObject | null {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data: JsonObject }).data;
  }
  return value && typeof value === 'object' ? (value as JsonObject) : null;
}

async function loadRepoContext(repoPath?: string, contextFile?: string): Promise<JsonObject> {
  if (contextFile) {
    return JSON.parse(await readFile(resolve(contextFile), 'utf8')) as JsonObject;
  }
  if (repoPath) {
    return inspectRepo(repoPath);
  }
  return {};
}

async function inspectRepo(rootPath: string): Promise<JsonObject> {
  const root = resolve(rootPath);
  const roots = await findGitRoots(root);
  const packageFiles = await findFiles(root, 'package.json', 5);
  const terraformFiles = (await findFiles(root, '.tf', 6)).filter((file) => file.endsWith('.tf'));
  const workflowFiles = (await findFiles(root, '.yml', 5))
    .concat(await findFiles(root, '.yaml', 5))
    .filter((file) => file.includes(`${sep()}.github${sep()}workflows${sep()}`));

  const packageSummaries = [];
  const dependencyNames = new Set<string>();
  for (const file of packageFiles) {
    const parsed = safeJson(await readFile(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object') continue;
    const pkg = parsed as {
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = Object.keys(pkg.dependencies ?? {});
    const devDeps = Object.keys(pkg.devDependencies ?? {});
    for (const dep of deps.concat(devDeps)) dependencyNames.add(dep);
    packageSummaries.push({
      path: relativeTo(root, file),
      name: pkg.name ?? basename(dirname(file)),
      dependencies: deps,
      devDependencies: devDeps,
    });
  }

  const textCorpus = [
    ...Array.from(dependencyNames),
    ...(await readSmallFiles(terraformFiles, 80_000)),
    ...(await readSmallFiles(workflowFiles, 80_000)),
  ]
    .join('\n')
    .toLowerCase();

  const vendors = detectVendors(textCorpus);
  const services = detectServices(textCorpus);
  const risks = detectRisks(vendors, services);

  return {
    inspectedAt: new Date().toISOString(),
    root,
    repositories: roots.map((repoRoot) => ({
      path: repoRoot,
      name: basename(repoRoot),
    })),
    packages: packageSummaries,
    infrastructure: {
      terraformFiles: terraformFiles.map((file) => relativeTo(root, file)),
      githubWorkflowFiles: workflowFiles.map((file) => relativeTo(root, file)),
      services,
    },
    vendors,
    risks,
    safety: {
      readOnly: true,
      skippedSensitivePatterns: SENSITIVE_PATTERNS,
    },
  };
}

const SENSITIVE_PATTERNS = [
  '.env',
  '.npmrc',
  '.pem',
  '.key',
  '.crt',
  '.tfvars',
  '.tfstate',
  'terraform.tfstate',
];

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.terraform',
]);

async function findGitRoots(root: string): Promise<string[]> {
  const roots: string[] = [];
  await walk(root, 4, async (file, entry) => {
    if (entry.isDirectory() && entry.name === '.git') {
      roots.push(dirname(file));
    }
  });
  return Array.from(new Set(roots)).sort();
}

async function findFiles(root: string, suffix: string, maxDepth: number): Promise<string[]> {
  const files: string[] = [];
  await walk(root, maxDepth, async (file, entry) => {
    if (entry.isFile() && file.endsWith(suffix) && !isSensitive(file)) {
      files.push(file);
    }
  });
  return files.sort();
}

async function walk(
  root: string,
  maxDepth: number,
  visit: (file: string, entry: { name: string; isDirectory(): boolean; isFile(): boolean }) => Promise<void> | void,
  depth = 0,
) {
  if (depth > maxDepth || isSensitive(root)) return;
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const file = join(root, entry.name);
    await visit(file, entry);
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
      await walk(file, maxDepth, visit, depth + 1);
    }
  }
}

async function readSmallFiles(files: string[], maxBytes: number): Promise<string[]> {
  const chunks = [];
  for (const file of files) {
    if (isSensitive(file)) continue;
    const info = await stat(file).catch(() => null);
    if (!info || info.size > maxBytes) continue;
    chunks.push(await readFile(file, 'utf8').catch(() => ''));
  }
  return chunks;
}

function detectVendors(text: string): Array<JsonObject> {
  const candidates = [
    ['Amazon Web Services', 'https://aws.amazon.com', 'cloud', ['aws', 'amazonaws', '@aws-sdk']],
    ['GitHub', 'https://github.com', 'software_as_a_service', ['github', 'actions/checkout', 'github_token']],
    ['SumSub', 'https://sumsub.com', 'software_as_a_service', ['sumsub']],
    ['Fireblocks', 'https://www.fireblocks.com', 'software_as_a_service', ['fireblocks']],
    ['Fiat Republic', 'https://fiatrepublic.com', 'finance', ['fiat republic', 'fiatrepublic']],
    ['Kraken', 'https://www.kraken.com', 'finance', ['kraken']],
    ['Google', 'https://cloud.google.com', 'software_as_a_service', ['google oauth', 'google-auth', 'googleapis']],
    ['TradingView', 'https://www.tradingview.com', 'software_as_a_service', ['tradingview']],
    ['PostgreSQL', 'https://www.postgresql.org', 'infrastructure', ['postgres', 'postgresql', 'rds']],
    ['SMTP Email Provider', undefined, 'software_as_a_service', ['smtp', 'nodemailer', 'resend']],
  ] as const;

  return candidates
    .filter(([, , , needles]) => needles.some((needle) => text.includes(needle)))
    .map(([name, website, category]) => ({
      name,
      website,
      category,
      isSubProcessor: true,
      description: `${name} detected during repository inspection.`,
    }));
}

function detectServices(text: string): string[] {
  const services = [
    ['aws-ecs', ['aws_ecs', 'ecs', 'fargate']],
    ['aws-rds', ['aws_db_instance', 'rds', 'postgres']],
    ['aws-ecr', ['aws_ecr', 'ecr']],
    ['aws-alb', ['aws_lb', 'load_balancer', 'alb']],
    ['aws-waf', ['aws_wafv2', 'waf']],
    ['aws-cloudtrail', ['cloudtrail']],
    ['aws-guardduty', ['guardduty']],
    ['aws-cloudwatch', ['cloudwatch', 'logs:']],
    ['aws-secrets-manager', ['secretsmanager', 'secrets manager']],
    ['github-actions', ['.github/workflows', 'github_token', 'actions/']],
    ['terraform', ['terraform', 'hashicorp/aws']],
  ] as const;

  return services
    .filter(([, needles]) => needles.some((needle) => text.includes(needle)))
    .map(([service]) => service);
}

function detectRisks(vendors: Array<JsonObject>, services: string[]): Array<JsonObject> {
  const risks: Array<JsonObject> = [
    {
      title: 'Cloud infrastructure misconfiguration',
      category: 'technology',
      description:
        'AWS resources, IAM, networking, logging, or encryption settings may drift from SOC 2 readiness expectations.',
    },
    {
      title: 'Source control and deployment control gaps',
      category: 'technology',
      description:
        'GitHub branch protection, CI/CD permissions, and release approvals need evidence before the Type 1 audit.',
    },
  ];

  if (vendors.length > 3) {
    risks.push({
      title: 'Third-party vendor oversight gaps',
      category: 'vendor_management',
      description:
        'Multiple critical vendors require security ownership, status, and risk treatment evidence.',
    });
  }
  if (services.includes('aws-rds')) {
    risks.push({
      title: 'Production database confidentiality and availability',
      category: 'technology',
      description:
        'Database encryption, backup retention, deletion protection, and access paths require readiness evidence.',
    });
  }
  return risks;
}

interface AwsRoleOptions {
  externalId: string;
  principalArn: string;
  profile?: string;
  region: string;
  roleName: string;
  dryRun: boolean;
}

async function setupAwsRole(options: AwsRoleOptions) {
  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: options.principalArn },
        Action: 'sts:AssumeRole',
        Condition: { StringEquals: { 'sts:ExternalId': options.externalId } },
      },
    ],
  };
  const costExplorerPolicy = {
    Version: '2012-10-17',
    Statement: [{ Effect: 'Allow', Action: 'ce:GetCostAndUsage', Resource: '*' }],
  };
  const extraReadPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['ssm:GetDocument', 'ssm:DescribeDocument', 'ssm:ListDocuments'],
        Resource: '*',
      },
    ],
  };

  const plannedActions = [
    'sts get-caller-identity',
    `iam get-role --role-name ${options.roleName}`,
    `iam create-role/update-assume-role-policy --role-name ${options.roleName}`,
    `iam attach-role-policy SecurityAudit`,
    `iam attach-role-policy ViewOnlyAccess`,
    `iam put-role-policy CompAI-CostExplorer`,
    `iam put-role-policy CompAI-ExtraReadAccess`,
  ];
  if (options.dryRun) {
    return { dryRun: true, plannedActions, trustPolicy };
  }

  const identity = await awsJson(['sts', 'get-caller-identity'], options);
  const accountId = String((identity as { Account?: string }).Account ?? '');
  const roleArn = `arn:aws:iam::${accountId}:role/${options.roleName}`;
  const trustFile = await writeTempJson(trustPolicy);
  const ceFile = await writeTempJson(costExplorerPolicy);
  const extraFile = await writeTempJson(extraReadPolicy);

  try {
    const existing = await awsJson(['iam', 'get-role', '--role-name', options.roleName], options).catch(() => null);
    if (existing) {
      await awsJson(
        [
          'iam',
          'update-assume-role-policy',
          '--role-name',
          options.roleName,
          '--policy-document',
          `file://${trustFile.path}`,
        ],
        options,
      );
    } else {
      await awsJson(
        [
          'iam',
          'create-role',
          '--role-name',
          options.roleName,
          '--max-session-duration',
          '43200',
          '--assume-role-policy-document',
          `file://${trustFile.path}`,
        ],
        options,
      );
    }

    await awsJson(
      [
        'iam',
        'attach-role-policy',
        '--role-name',
        options.roleName,
        '--policy-arn',
        'arn:aws:iam::aws:policy/SecurityAudit',
      ],
      options,
    );
    await awsJson(
      [
        'iam',
        'attach-role-policy',
        '--role-name',
        options.roleName,
        '--policy-arn',
        'arn:aws:iam::aws:policy/job-function/ViewOnlyAccess',
      ],
      options,
    );
    await awsJson(
      [
        'iam',
        'put-role-policy',
        '--role-name',
        options.roleName,
        '--policy-name',
        'CompAI-CostExplorer',
        '--policy-document',
        `file://${ceFile.path}`,
      ],
      options,
    );
    await awsJson(
      [
        'iam',
        'put-role-policy',
        '--role-name',
        options.roleName,
        '--policy-name',
        'CompAI-ExtraReadAccess',
        '--policy-document',
        `file://${extraFile.path}`,
      ],
      options,
    );

    return {
      roleArn,
      externalId: options.externalId,
      principalArn: options.principalArn,
      awsAccountId: accountId,
      region: options.region,
      roleName: options.roleName,
      plannedActions,
    };
  } finally {
    await Promise.all([trustFile.cleanup(), ceFile.cleanup(), extraFile.cleanup()]);
  }
}

async function connectAws(params: {
  apiUrl?: string;
  apiKey: string;
  roleArn: string;
  externalId: string;
  regions: string[];
  connectionName: string;
}) {
  const existing = await apiRequest('/v1/integrations/connections', {
    apiUrl: params.apiUrl,
    apiKey: params.apiKey,
  });
  const connections = Array.isArray(existing) ? existing : [];
  const credentials = {
    connectionName: params.connectionName,
    roleArn: params.roleArn,
    externalId: params.externalId,
    regions: params.regions,
  };
  const match = connections.find((connection) => {
    const item = connection as {
      id?: string;
      providerSlug?: string;
      metadata?: { roleArn?: string };
      status?: string;
    };
    return item.providerSlug === 'aws' && item.metadata?.roleArn === params.roleArn && item.status !== 'disconnected';
  });
  if (match) {
    const item = match as { id?: string; status?: string };
    if (item.status === 'active') {
      return { reused: true, connection: match };
    }
    if (!item.id) {
      throw new CliError('Matched AWS connection is missing an id.', 'INVALID_CONNECTION');
    }
    await apiRequest(`/v1/integrations/connections/${item.id}/credentials`, {
      method: 'PUT',
      apiUrl: params.apiUrl,
      apiKey: params.apiKey,
      body: { credentials },
    });
    const repaired = await apiRequest(`/v1/integrations/connections/${item.id}`, {
      apiUrl: params.apiUrl,
      apiKey: params.apiKey,
    });
    return { reused: true, repaired: true, connection: repaired };
  }

  const created = await apiRequest('/v1/integrations/connections', {
    method: 'POST',
    apiUrl: params.apiUrl,
    apiKey: params.apiKey,
    body: {
      providerSlug: 'aws',
      credentials,
    },
  });

  return { reused: false, connection: created };
}

async function scanAws(params: { apiUrl?: string; apiKey: string; connectionId?: string }) {
  let connectionId = params.connectionId;
  if (!connectionId) {
    const existing = await apiRequest('/v1/integrations/connections', {
      apiUrl: params.apiUrl,
      apiKey: params.apiKey,
    });
    const awsConnections = Array.isArray(existing)
      ? existing.filter((connection) => (connection as { providerSlug?: string; status?: string }).providerSlug === 'aws' && (connection as { status?: string }).status === 'active')
      : [];
    if (awsConnections.length === 0) {
      throw new CliError('No active AWS connection found. Run compctl aws connect first.', 'NO_AWS_CONNECTION');
    }
    connectionId = String((awsConnections[0] as { id: string }).id);
  }

  let detectedServices: unknown = null;
  try {
    detectedServices = await apiRequest(`/v1/cloud-security/detect-services/${connectionId}`, {
      method: 'POST',
      apiUrl: params.apiUrl,
      apiKey: params.apiKey,
    });
  } catch (error) {
    progress(`Service detection skipped: ${error instanceof Error ? error.message : String(error)}`);
  }

  const scan = await apiRequest(`/v1/cloud-security/scan/${connectionId}`, {
    method: 'POST',
    apiUrl: params.apiUrl,
    apiKey: params.apiKey,
  });
  const findings = await apiRequest('/v1/cloud-security/findings', {
    apiUrl: params.apiUrl,
    apiKey: params.apiKey,
  });

  return { connectionId, detectedServices, scan, findings };
}

async function awsJson(args: string[], options: Pick<AwsRoleOptions, 'profile' | 'region'>) {
  const finalArgs = [...args, '--region', options.region, '--output', 'json'];
  if (options.profile) finalArgs.push('--profile', options.profile);
  const { stdout, stderr } = await execFileAsync('aws', finalArgs, {
    maxBuffer: 10 * 1024 * 1024,
  });
  if (stderr.trim()) progress(stderr.trim());
  return stdout.trim() ? safeJson(stdout) : {};
}

async function writeTempJson(value: unknown) {
  const dir = await mkdtemp(join(tmpdir(), 'compctl-'));
  const path = join(dir, 'document.json');
  await writeFile(path, JSON.stringify(value));
  return {
    path,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

function outputSuccess(data: unknown) {
  console.log(JSON.stringify({ success: true, data: unwrapData(data) ?? data }, null, 2));
}

function outputError(error: unknown) {
  if (error instanceof ApiError) {
    console.log(
      JSON.stringify(
        {
          success: false,
          error: {
            code: 'API_ERROR',
            status: error.status,
            message: error.message,
            details: error.details,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  if (error instanceof CliError) {
    console.log(
      JSON.stringify(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(
    JSON.stringify(
      {
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      },
      null,
      2,
    ),
  );
}

function progress(message: string) {
  process.stderr.write(`[compctl] ${message}\n`);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isSensitive(file: string): boolean {
  const lower = file.toLowerCase();
  return SENSITIVE_PATTERNS.some((pattern) => lower.includes(pattern));
}

function relativeTo(root: string, file: string): string {
  return file.startsWith(root) ? file.slice(root.length + 1) : file;
}

function sep() {
  return process.platform === 'win32' ? '\\' : '/';
}

program.parseAsync().catch((error) => {
  outputError(error);
  process.exitCode = 1;
});
