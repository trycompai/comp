import type { DeviceCheckType, RemediationInfo, RemediationResult } from '../shared/types';
import type { ComplianceRemediation } from './types';

// macOS remediations
import { MacOSAntivirusRemediation } from './macos/antivirus';
import { MacOSDiskEncryptionRemediation } from './macos/disk-encryption';
import { MacOSPasswordPolicyRemediation } from './macos/password-policy';
import { MacOSScreenLockRemediation } from './macos/screen-lock';

// Linux remediations
import { LinuxAntivirusRemediation } from './linux/antivirus';
import { LinuxDiskEncryptionRemediation } from './linux/disk-encryption';
import { LinuxPasswordPolicyRemediation } from './linux/password-policy';
import { LinuxScreenLockRemediation } from './linux/screen-lock';

// Windows remediations
import { WindowsAntivirusRemediation } from './windows/antivirus';
import { WindowsDiskEncryptionRemediation } from './windows/disk-encryption';
import { WindowsPasswordPolicyRemediation } from './windows/password-policy';
import { WindowsScreenLockRemediation } from './windows/screen-lock';

/**
 * Returns the appropriate remediation modules for the current platform.
 */
function getRemediationsForPlatform(): ComplianceRemediation[] {
  const platform = process.platform;

  if (platform === 'darwin') {
    return [
      new MacOSDiskEncryptionRemediation(),
      new MacOSAntivirusRemediation(),
      new MacOSPasswordPolicyRemediation(),
      new MacOSScreenLockRemediation(),
    ];
  }

  if (platform === 'linux') {
    return [
      new LinuxDiskEncryptionRemediation(),
      new LinuxAntivirusRemediation(),
      new LinuxPasswordPolicyRemediation(),
      new LinuxScreenLockRemediation(),
    ];
  }

  if (platform === 'win32') {
    return [
      new WindowsDiskEncryptionRemediation(),
      new WindowsAntivirusRemediation(),
      new WindowsPasswordPolicyRemediation(),
      new WindowsScreenLockRemediation(),
    ];
  }

  console.warn(`Unsupported platform for remediation: ${platform}`);
  return [];
}

/**
 * Returns remediation info for all checks on the current platform.
 */
export function getAllRemediationInfo(): RemediationInfo[] {
  const remediations = getRemediationsForPlatform();
  return remediations.map((r) => r.getInfo());
}

/**
 * Runs remediation for a specific check type.
 * Returns the remediation result.
 */
export async function runRemediation(checkType: DeviceCheckType): Promise<RemediationResult> {
  const remediations = getRemediationsForPlatform();
  const remediation = remediations.find((r) => r.checkType === checkType);

  if (!remediation) {
    return {
      checkType,
      success: false,
      message: `No remediation available for ${checkType} on this platform`,
    };
  }

  try {
    console.log(`Running remediation: ${checkType}`);
    const result = await remediation.remediate();
    console.log(
      `  Remediation ${checkType}: ${result.success ? 'SUCCESS' : 'FAILED'} - ${result.message}`,
    );
    return result;
  } catch (error) {
    console.error(`Remediation failed: ${checkType}`, error);
    return {
      checkType,
      success: false,
      message: `Remediation failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
