import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repositoryRoot = resolve(import.meta.dir, '../..');
const workflowsDirectory = join(repositoryRoot, '.github/workflows');
const actionsDirectory = join(repositoryRoot, '.github/actions');
const securityWorkflowPath = join(workflowsDirectory, 'security-regression.yml');
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
    expect(isRecord(configuration.on) && 'pull_request' in configuration.on).toBe(true);
    expect(isRecord(configuration.on) && 'pull_request_target' in configuration.on).toBe(false);
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
