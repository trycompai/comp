/**
 * Pure helpers for grouping findings by check within a service. Kept in
 * its own file (no React imports) so the logic can be unit-tested without
 * spinning up jsdom.
 */

import type { Finding } from '../types';

export interface CheckGroup {
  /** Stable identifier — matches Finding.checkKey, used as React key. */
  checkKey: string;
  /** Display title with resource-specific tokens stripped. */
  checkTitle: string;
  /** All findings for this check (both passed and failed) in input order. */
  all: Finding[];
  /** Failing findings only. */
  failed: Finding[];
  /** Passing findings only. */
  passed: Finding[];
  /** Severity displayed in the sub-header — highest among failures, info if none. */
  severity: string;
}

const SEVERITY_RANK: Record<string, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

/**
 * Derive a check-level title from a representative finding by stripping
 * the resource-specific portion. Used as the sub-group header text.
 *
 * Heuristics applied in order:
 *   1. If `resourceId` is wrapped in quotes in the title (`"john"`), drop the quoted segment.
 *   2. Otherwise, drop the literal resourceId substring.
 *   3. If neither matches, fall back to the title unchanged.
 *
 * Always collapses any resulting double-spaces.
 */
export function deriveCheckTitle(finding: Finding): string {
  const raw = finding.title?.trim();
  if (!raw) return finding.checkKey ?? 'Untitled check';

  const resourceId = finding.resourceId;
  if (!resourceId || resourceId === 'account-level') return raw;

  let cleaned = raw;
  const quoted = `"${resourceId}"`;
  if (cleaned.includes(quoted)) {
    cleaned = cleaned.replace(quoted, '').trim();
  } else if (cleaned.includes(resourceId)) {
    cleaned = cleaned.replace(resourceId, '').trim();
  } else {
    return raw;
  }

  return cleaned.replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1');
}

/**
 * Group an array of findings into per-check sub-groups. Each group carries
 * the failed/passed split and a derived check-level title.
 *
 * Order: groups with failures first (sorted by highest severity), then
 * all-passing groups alphabetically.
 */
export function buildCheckGroups(findings: Finding[]): CheckGroup[] {
  if (findings.length === 0) return [];

  const byKey = new Map<string, Finding[]>();
  for (const finding of findings) {
    // Fall back to title-as-key for legacy findings with no checkKey — keeps
    // them grouped sensibly enough.
    const key = finding.checkKey ?? finding.title ?? finding.id;
    const bucket = byKey.get(key) ?? [];
    bucket.push(finding);
    byKey.set(key, bucket);
  }

  const groups: CheckGroup[] = [];
  for (const [checkKey, bucket] of byKey) {
    const failed = bucket.filter(
      (f) => f.status === 'failed' || f.status === 'FAILED',
    );
    const passed = bucket.filter(
      (f) => f.status === 'passed' || f.status === 'success',
    );
    const representative = failed[0] ?? bucket[0];
    const severity =
      failed.length === 0
        ? 'info'
        : failed.reduce((highest, f) => {
            const sev = (f.severity ?? 'info').toLowerCase();
            return (SEVERITY_RANK[sev] ?? 0) > (SEVERITY_RANK[highest] ?? 0)
              ? sev
              : highest;
          }, 'info');

    groups.push({
      checkKey,
      checkTitle: deriveCheckTitle(representative),
      all: bucket,
      failed,
      passed,
      severity,
    });
  }

  return groups.sort((a, b) => {
    // Failures first.
    if (a.failed.length > 0 && b.failed.length === 0) return -1;
    if (a.failed.length === 0 && b.failed.length > 0) return 1;
    // Among failures, highest severity first.
    if (a.failed.length > 0 && b.failed.length > 0) {
      const sevDiff =
        (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
      if (sevDiff !== 0) return sevDiff;
    }
    // Otherwise alphabetical for stability.
    return a.checkTitle.localeCompare(b.checkTitle);
  });
}
