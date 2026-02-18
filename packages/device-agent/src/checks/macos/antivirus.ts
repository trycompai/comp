import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

/**
 * Checks if antivirus protection is active on macOS.
 *
 * On macOS, XProtect is built-in and always active on supported versions.
 * We verify:
 *  1. XProtect bundle exists at the expected path
 *  2. Optionally detect third-party AV software
 */
export class MacOSAntivirusCheck implements ComplianceCheck {
  checkType = 'antivirus' as const;
  displayName = 'Antivirus (XProtect)';

  private static readonly XPROTECT_PATHS = [
    '/Library/Apple/System/Library/CoreServices/XProtect.bundle',
    '/System/Library/CoreServices/XProtect.bundle',
  ];

  private static readonly KNOWN_AV_PROCESSES = [
    'MalwareBytes',
    'Sophos',
    'CrowdStrike',
    'SentinelOne',
    'Norton',
    'McAfee',
    'Avast',
    'AVG',
    'Kaspersky',
    'ESET',
    'Bitdefender',
    'Trend Micro',
    'Webroot',
  ];

  async run(): Promise<CheckResult> {
    try {
      // Check XProtect
      const xprotectExists = MacOSAntivirusCheck.XPROTECT_PATHS.some((p) => existsSync(p));

      // Check for third-party AV by looking at running processes
      let thirdPartyAV: string | null = null;
      try {
        const processes = execSync('ps aux', { encoding: 'utf-8', timeout: 10000 });
        for (const av of MacOSAntivirusCheck.KNOWN_AV_PROCESSES) {
          if (processes.toLowerCase().includes(av.toLowerCase())) {
            thirdPartyAV = av;
            break;
          }
        }
      } catch {
        // ps aux failure is non-critical
      }

      const passed = xprotectExists;
      const details: string[] = [];

      if (xprotectExists) {
        details.push('XProtect is active');
      } else {
        details.push('XProtect not found');
      }

      if (thirdPartyAV) {
        details.push(`Third-party AV detected: ${thirdPartyAV}`);
      }

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: 'xprotect-bundle-check + process-scan',
          raw: JSON.stringify({ xprotectExists, thirdPartyAV }),
          message: details.join('. '),
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'xprotect-bundle-check',
          raw: error instanceof Error ? error.message : String(error),
          message: 'Unable to determine antivirus status',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
