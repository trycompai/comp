import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dir, '../..');
const workflowsDirectory = join(repositoryRoot, '.github/workflows');
const actionsDirectory = join(repositoryRoot, '.github/actions');
const securityWorkflowPath = join(workflowsDirectory, 'security-regression.yml');
const prepareSpeakeasyDirectory = join(actionsDirectory, 'prepare-speakeasy');
const speakeasyWorkflowPath = join(repositoryRoot, 'apps/mcp-server/.speakeasy/workflow.yaml');
const packageManifest: unknown = JSON.parse(
  readFileSync(join(repositoryRoot, 'package.json'), 'utf8'),
);
if (!isRecord(packageManifest) || typeof packageManifest.packageManager !== 'string') {
  throw new Error('Root package.json must declare the pinned Bun packageManager');
}
const expectedBunVersion = packageManifest.packageManager.replace('bun@', '');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseConfiguration(path: string): Record<string, unknown> {
  const configuration: unknown = Bun.YAML.parse(readFileSync(path, 'utf8'));
  if (!isRecord(configuration)) throw new Error(`Invalid YAML configuration: ${path}`);
  return configuration;
}

function* configurationObjects(value: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(value)) {
    for (const child of value) yield* configurationObjects(child);
    return;
  }
  if (!isRecord(value)) return;
  yield value;
  for (const child of Object.values(value)) yield* configurationObjects(child);
}

// Joins shell and PowerShell line continuations so one command reads as one line.
function joinContinuations(script: string): string {
  return script.replace(/[\\`]\r?\n\s*/g, ' ');
}

const fileDownload =
  /\b(?:wget|Invoke-WebRequest|iwr|Start-BitsTransfer)\b|\bgh\s+release\s+download\b|\bcurl\b[^\n]*\s(?:-[a-zA-Z]*o\b|-O\b|--output\b|--remote-name\b)/;
const digestCheck = /\bsha256sum\b[^\n]*\s(?:--check|-c)\b|\bGet-FileHash\b[^\n]*SHA256/;
const committedDigest = /\b[a-f0-9]{64}\b/i;

const activePaths = [
  ...readdirSync(workflowsDirectory)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => join(workflowsDirectory, name)),
  ...readdirSync(actionsDirectory).map((name) => join(actionsDirectory, name, 'action.yml')),
];

describe('active GitHub Actions security policy', () => {
  for (const path of activePaths) {
    test(`${path.replace(`${repositoryRoot}/`, '')} parses and uses immutable actions`, () => {
      const configuration = parseConfiguration(path);
      for (const object of configurationObjects(configuration)) {
        if (typeof object.uses !== 'string' || object.uses.startsWith('./')) continue;
        expect(object.uses).toMatch(/@[a-f0-9]{40}$|@sha256:[a-f0-9]{64}$/);
      }
    });

    test(`${path.replace(`${repositoryRoot}/`, '')} verifies downloads before secrets are exposed`, () => {
      for (const object of configurationObjects(parseConfiguration(path))) {
        if (typeof object.run !== 'string') continue;
        const script = joinContinuations(object.run);
        if (!fileDownload.test(script)) continue;
        const step = `${script}\n${JSON.stringify(object.env ?? {})}`;
        expect(step).toMatch(digestCheck);
        expect(step).toMatch(committedDigest);
        expect(step).not.toMatch(/\bsecrets\s*[.[]/);
      }
    });

    test(`${path.replace(`${repositoryRoot}/`, '')} runs no tool resolved by a floating version`, () => {
      for (const object of configurationObjects(parseConfiguration(path))) {
        if (typeof object.run === 'string') expect(object.run).not.toMatch(/@latest\b/);
        if (typeof object.uses === 'string') {
          // Speakeasy's published action downloads the newest CLI on every run.
          expect(object.uses).not.toMatch(/^speakeasy-api\/sdk-generation-action\b/);
        }
        if (!isRecord(object.with)) continue;
        for (const [input, value] of Object.entries(object.with)) {
          if (!/version$/i.test(input)) continue;
          expect(String(value).trim().toLowerCase()).not.toBe('latest');
        }
      }
    });

    test(`${path.replace(`${repositoryRoot}/`, '')} avoids streamed installers and pins Bun`, () => {
      for (const object of configurationObjects(parseConfiguration(path))) {
        if (typeof object.run === 'string') {
          expect(object.run).not.toMatch(/\b(?:curl|wget)\b[^\n]*\|\s*(?:sudo\s+)?(?:ba)?sh\b/);
        }
        if (typeof object.uses !== 'string' || !object.uses.startsWith('oven-sh/setup-bun@')) {
          continue;
        }
        expect(isRecord(object.with) && object.with['bun-version']).toBe(expectedBunVersion);
      }
    });
  }

  test('credential-bearing legacy review and publishing workflows stay archived', () => {
    for (const name of ['security-review.yml', 'gram-sync.yml']) {
      expect(existsSync(join(workflowsDirectory, name))).toBe(false);
      const archivedPath = join(repositoryRoot, '.github/workflows_disabled', `${name}.disabled`);
      expect(existsSync(archivedPath)).toBe(true);
      expect(parseConfiguration(archivedPath)).toHaveProperty('jobs');
    }
    for (const path of activePaths) {
      const source = readFileSync(path, 'utf8');
      expect(source).not.toMatch(/claude-code-security-review|ANTHROPIC_API_KEY|GRAM_API_KEY/);
    }
  });

  test('Speakeasy runs only the reviewed, digest-verified CLI pinned in workflow.yaml', () => {
    const prepare = parseConfiguration(join(prepareSpeakeasyDirectory, 'action.yml'));
    const bake = [...configurationObjects(prepare)].find(
      (object) => isRecord(object.env) && 'SPEAKEASY_CLI_VERSION' in object.env,
    );
    if (!bake || !isRecord(bake.env) || typeof bake.run !== 'string') {
      throw new Error('prepare-speakeasy must bake a pinned Speakeasy CLI');
    }
    const pinnedVersion = String(bake.env.SPEAKEASY_CLI_VERSION);
    expect(pinnedVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(String(bake.env.SPEAKEASY_CLI_SHA256)).toMatch(/^[a-f0-9]{64}$/);
    expect(bake.run).toContain('sha256sum --check --strict');
    expect(bake.run).toContain('cp "$GITHUB_ACTION_PATH/Dockerfile"');

    // Any other version makes the CLI download and re-execute that release.
    const speakeasyWorkflow = parseConfiguration(speakeasyWorkflowPath);
    expect(String(speakeasyWorkflow.speakeasyVersion)).toBe(pinnedVersion);

    const dockerfile = readFileSync(join(prepareSpeakeasyDirectory, 'Dockerfile'), 'utf8');
    const baseImages = [...dockerfile.matchAll(/^FROM\s+(\S+)/gm)].map((match) => match[1]);
    expect(baseImages.length).toBeGreaterThan(0);
    for (const image of baseImages) expect(image).toMatch(/@sha256:[a-f0-9]{64}$/);
    expect(dockerfile).not.toMatch(/\b(?:curl|wget)\b/);
    // The action downloads the newest CLI when /bin/speakeasy is missing.
    expect(dockerfile).toContain('COPY speakeasy /bin/speakeasy');

    for (const path of activePaths) {
      const jobs = parseConfiguration(path).jobs;
      if (!isRecord(jobs)) continue;
      for (const job of Object.values(jobs)) {
        if (!isRecord(job) || !Array.isArray(job.steps)) continue;
        let prepared = false;
        for (const step of job.steps) {
          if (!isRecord(step) || typeof step.uses !== 'string') continue;
          if (step.uses === './.github/actions/prepare-speakeasy') prepared = true;
          if (step.uses !== './_speakeasy') continue;
          expect(prepared).toBe(true);
          if (!isRecord(step.with) || step.with.action !== 'run-workflow') continue;
          // Generation installs these with pipx and takes the newest release when unset.
          expect(String(step.with.poetry_version)).toMatch(/^\d+\.\d+\.\d+$/);
          expect(String(step.with.uv_version)).toMatch(/^\d+\.\d+\.\d+$/);
        }
      }
    }
  });

  test('Dependabot keeps immutable action references maintained', () => {
    const dependabot = parseConfiguration(join(repositoryRoot, '.github/dependabot.yml'));
    expect(Array.isArray(dependabot.updates)).toBe(true);
    if (!Array.isArray(dependabot.updates)) return;
    expect(
      dependabot.updates.some(
        (update: unknown) => isRecord(update) && update['package-ecosystem'] === 'github-actions',
      ),
    ).toBe(true);
  });

  test('PR security regressions execute without repository secrets or write tokens', () => {
    const configuration = parseConfiguration(securityWorkflowPath);
    expect(configuration.permissions).toEqual({ contents: 'read' });
    // Bun.YAML parses a bare `on:` key as `true`.
    const triggers = configuration.on ?? configuration.true;
    expect(isRecord(triggers) && 'pull_request' in triggers).toBe(true);
    expect(isRecord(triggers) && 'pull_request_target' in triggers).toBe(false);
    const source = readFileSync(securityWorkflowPath, 'utf8');
    expect(source).not.toMatch(/\bsecrets\s*[.\[]|secrets:\s*inherit/);
    expect(source).not.toContain('continue-on-error');
    const objects = [...configurationObjects(configuration)];
    for (const object of objects) {
      if (object.permissions !== undefined)
        expect(object.permissions).toEqual({ contents: 'read' });
      if (typeof object.uses !== 'string' || !object.uses.startsWith('actions/checkout@')) continue;
      expect(isRecord(object.with) && object.with['persist-credentials']).toBe(false);
    }
    expect(
      objects.some(
        (object) =>
          typeof object.run === 'string' &&
          /bun install\b/.test(object.run) &&
          object.run.includes('--frozen-lockfile') &&
          object.run.includes('--ignore-scripts'),
      ),
    ).toBe(true);
    expect(source).toContain('bun test ./.github/tests/security-ci.test.ts');
    expect(source).toContain('bunx --no-install vitest run');
    expect(source).toContain('bunx --no-install jest');
  });
});
