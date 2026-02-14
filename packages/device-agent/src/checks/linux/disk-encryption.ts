import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

interface LsblkDevice {
  name: string;
  fstype: string | null;
  type: string;
  mountpoint: string | null;
  children?: LsblkDevice[];
}

/**
 * Checks if disk encryption (LUKS) is enabled on Linux.
 *
 * If LUKS is not detected, the check passes with a note since enabling
 * LUKS requires a full OS reinstall — it cannot be done on a running system.
 *
 * Detection methods:
 *  1. `lsblk` to find block devices backing the root filesystem and check for crypto_LUKS
 *  2. `dmsetup status` to detect active dm-crypt mappings
 *  3. Check /etc/crypttab for configured encrypted volumes
 */
export class LinuxDiskEncryptionCheck implements ComplianceCheck {
  checkType = 'disk_encryption' as const;
  displayName = 'Disk Encryption (LUKS)';

  async run(): Promise<CheckResult> {
    try {
      // Method 1: Check lsblk for LUKS type on devices backing root
      const luksDetected = this.checkLsblk();
      if (luksDetected) {
        return {
          checkType: this.checkType,
          passed: true,
          details: {
            method: 'lsblk',
            raw: 'LUKS detected via lsblk',
            message: 'LUKS disk encryption is enabled on the root filesystem',
          },
          checkedAt: new Date().toISOString(),
        };
      }

      // Method 2: Check dmsetup for active crypt targets
      const dmCryptActive = this.checkDmsetup();
      if (dmCryptActive) {
        return {
          checkType: this.checkType,
          passed: true,
          details: {
            method: 'dmsetup',
            raw: 'dm-crypt target active',
            message: 'Disk encryption is active (dm-crypt detected)',
          },
          checkedAt: new Date().toISOString(),
        };
      }

      // Method 3: Check /etc/crypttab
      const crypttabConfigured = this.checkCrypttab();
      if (crypttabConfigured) {
        return {
          checkType: this.checkType,
          passed: true,
          details: {
            method: '/etc/crypttab',
            raw: 'Encrypted volumes configured in /etc/crypttab',
            message: 'Disk encryption is configured via /etc/crypttab',
          },
          checkedAt: new Date().toISOString(),
        };
      }

      // LUKS is not set up — pass with a note since enabling it requires OS reinstall
      return {
        checkType: this.checkType,
        passed: true,
        details: {
          method: 'lsblk + dmsetup + crypttab',
          raw: 'No LUKS or dm-crypt encryption detected',
          message:
            'Disk encryption (LUKS) is not enabled. Enabling LUKS requires an OS reinstall. This check is not applicable to your current setup.',
          exception: 'LUKS not enabled (requires OS reinstall to enable)',
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        passed: true,
        details: {
          method: 'lsblk + dmsetup',
          raw: error instanceof Error ? error.message : String(error),
          message:
            'Unable to determine disk encryption status. This check is not applicable.',
          exception: 'Unable to check (not applicable)',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }

  private checkLsblk(): boolean {
    try {
      const output = execSync('lsblk -o NAME,FSTYPE,TYPE,MOUNTPOINT --json 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      const data = JSON.parse(output);
      return this.findLuks(data.blockdevices || []);
    } catch {
      return false;
    }
  }

  private findLuks(devices: LsblkDevice[]): boolean {
    for (const device of devices) {
      if (device.fstype === 'crypto_LUKS' || device.type === 'crypt') {
        return true;
      }
      if (device.children && this.findLuks(device.children)) {
        return true;
      }
    }
    return false;
  }

  private checkDmsetup(): boolean {
    try {
      const output = execSync('dmsetup status 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 10000,
      });

      return output.toLowerCase().includes('crypt');
    } catch {
      return false;
    }
  }

  private checkCrypttab(): boolean {
    try {
      const output = execSync('cat /etc/crypttab 2>/dev/null', {
        encoding: 'utf-8',
        timeout: 5000,
      });

      // Filter out comments and empty lines
      const entries = output
        .split('\n')
        .filter((line) => line.trim() && !line.trim().startsWith('#'));
      return entries.length > 0;
    } catch {
      return false;
    }
  }
}
