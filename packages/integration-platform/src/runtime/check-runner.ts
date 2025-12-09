import type { IntegrationCheck, IntegrationManifest } from '../types';
import { createCheckContext, type CheckContextOptions, type CheckResult } from './check-context';

// ============================================================================
// Check Runner
// ============================================================================

export interface RunCheckOptions extends Omit<CheckContextOptions, 'manifest'> {
  /** The integration manifest */
  manifest: IntegrationManifest;
  /** Specific check ID to run (optional - runs all if not specified) */
  checkId?: string;
}

export interface CheckRunResult {
  checkId: string;
  checkName: string;
  status: 'success' | 'failed' | 'error';
  result: CheckResult;
  error?: string;
  durationMs: number;
}

export interface RunAllChecksResult {
  results: CheckRunResult[];
  totalFindings: number;
  totalPassing: number;
  durationMs: number;
}

/**
 * Run a single check
 */
export async function runCheck(
  check: IntegrationCheck,
  options: Omit<RunCheckOptions, 'checkId'>,
): Promise<CheckRunResult> {
  const startTime = Date.now();

  const { ctx, getResults } = createCheckContext(options);

  try {
    ctx.log(`Starting check: ${check.name}`);
    await check.run(ctx);
    ctx.log(`Completed check: ${check.name}`);

    const result = getResults();
    const status = result.findings.length > 0 ? 'failed' : 'success';

    return {
      checkId: check.id,
      checkName: check.name,
      status,
      result,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    const result = getResults();
    ctx.error(`Check failed: ${check.name}`, { error: String(err) });

    return {
      checkId: check.id,
      checkName: check.name,
      status: 'error',
      result,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Run all checks for an integration
 */
export async function runAllChecks(options: RunCheckOptions): Promise<RunAllChecksResult> {
  const startTime = Date.now();
  const { manifest, checkId } = options;

  const checks = manifest.checks || [];

  if (checks.length === 0) {
    return {
      results: [],
      totalFindings: 0,
      totalPassing: 0,
      durationMs: Date.now() - startTime,
    };
  }

  // Filter to specific check if requested
  const checksToRun = checkId ? checks.filter((c) => c.id === checkId) : checks;

  if (checkId && checksToRun.length === 0) {
    throw new Error(`Check "${checkId}" not found in manifest`);
  }

  const results: CheckRunResult[] = [];

  for (const check of checksToRun) {
    const result = await runCheck(check, options);
    results.push(result);
  }

  const totalFindings = results.reduce((sum, r) => sum + r.result.findings.length, 0);
  const totalPassing = results.reduce((sum, r) => sum + r.result.passingResults.length, 0);

  return {
    results,
    totalFindings,
    totalPassing,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Get available checks for an integration
 */
export function getAvailableChecks(
  manifest: IntegrationManifest,
): Array<{ id: string; name: string; description: string; taskMapping?: string }> {
  return (manifest.checks || []).map((check) => ({
    id: check.id,
    name: check.name,
    description: check.description,
    taskMapping: check.taskMapping,
  }));
}
