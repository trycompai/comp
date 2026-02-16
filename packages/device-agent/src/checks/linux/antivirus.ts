import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

/**
 * Checks if antivirus or security software is active on Linux.
 *
 * Detection methods:
 *  1. Check for known AV processes (ClamAV, CrowdStrike, SentinelOne, etc.)
 *  2. Check AppArmor enforcement status
 *  3. Check SELinux enforcement status
 *
 * Passes if any AV process is running OR a mandatory access control
 * framework (AppArmor/SELinux) is in enforcing mode.
 */
export class LinuxAntivirusCheck implements ComplianceCheck {
  checkType = 'antivirus' as const;
  displayName = 'Antivirus / Security Software';

  private static readonly KNOWN_AV_PROCESSES = [
    'clamd',
    'freshclam',
    'clamav',
    'falcon-sensor',
    'SentinelAgent',
    'sentinelone',
    'sophos',
    'sophosav',
    'savd',
    'esets_daemon',
    'bdagent',
    'McAfeeAgent',
  ];

  async run(): Promise<CheckResult> {
    try {
      const avProcess = this.findAVProcess();
      const appArmorEnforcing = this.checkAppArmor();
      const seLinuxEnforcing = this.checkSELinux();

      const passed = avProcess !== null || appArmorEnforcing || seLinuxEnforcing;
      const details: string[] = [];

      if (avProcess) {
        details.push(`Antivirus detected: ${avProcess}`);
      }

      if (appArmorEnforcing) {
        details.push('AppArmor is in enforcing mode');
      }

      if (seLinuxEnforcing) {
        details.push('SELinux is in enforcing mode');
      }

      if (!passed) {
        details.push('No antivirus software or mandatory access control detected');
      }

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: 'process-scan + apparmor + selinux',
          raw: JSON.stringify({ avProcess, appArmorEnforcing, seLinuxEnforcing }),
          message: details.join('. '),
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'process-scan',
          raw: error instanceof Error ? error.message : String(error),
          message: 'Unable to determine antivirus status',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private findAVProcess(): string | null {
    try {
      const processes = execSync('ps aux', { encoding: 'utf-8', timeout: 10000 });
      for (const av of LinuxAntivirusCheck.KNOWN_AV_PROCESSES) {
        if (processes.toLowerCase().includes(av.toLowerCase())) {
          return av;
        }
      }
    } catch {
      // ps aux failure is non-critical
    }
    return null;
  }

  private checkAppArmor(): boolean {
    try {
      const output = execSync('aa-status --enabled 2>/dev/null && echo "enabled"', {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return output.trim().includes('enabled');
    } catch {
      // aa-status not available or not enforcing
    }

    try {
      const output = execSync('cat /sys/module/apparmor/parameters/enabled 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return output.trim() === 'Y';
    } catch {
      return false;
    }
  }

  private checkSELinux(): boolean {
    try {
      const output = execSync('getenforce 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 5000,
      });
      return output.trim().toLowerCase() === 'enforcing';
    } catch {
      return false;
    }
  }
}
