import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

/**
 * Checks if antivirus software is installed and active on Windows.
 *
 * Uses WMI query through Security Center 2 to detect registered AV products.
 * Also checks Windows Defender status via Get-MpComputerStatus.
 */
export class WindowsAntivirusCheck implements ComplianceCheck {
  checkType = 'antivirus' as const;
  displayName = 'Antivirus';

  async run(): Promise<CheckResult> {
    try {
      // Query SecurityCenter2 for registered antivirus products
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct | Select-Object -Property displayName,productState | ConvertTo-Json"',
        { encoding: 'utf-8', timeout: 15000 },
      ).trim();

      if (!output || output === '' || output === 'null') {
        return this.checkWindowsDefenderFallback();
      }

      // Parse the result - could be a single object or an array
      const parsed = JSON.parse(output);
      const products = Array.isArray(parsed) ? parsed : [parsed];

      const activeProducts = products.filter((p: { displayName: string; productState: number }) => {
        // productState is a bitmask. Bit 12 (0x1000) indicates the AV is active/enabled.
        // Common active states: 397568 (Windows Defender on), 266240 (third-party on)
        const stateHex = p.productState.toString(16);
        // The second nibble from the left indicates scanner status (1 = on, 0 = off)
        const scannerActive = stateHex.length >= 4 && stateHex[stateHex.length - 4] === '1';
        return scannerActive || p.productState > 0;
      });

      const passed = activeProducts.length > 0;
      const productNames = activeProducts.map((p: { displayName: string }) => p.displayName).join(', ');

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: 'Get-CimInstance AntiVirusProduct',
          raw: output.substring(0, 500),
          message: passed
            ? `Active antivirus detected: ${productNames}`
            : 'No active antivirus product detected',
        },
        checkedAt: new Date().toISOString(),
      };
    } catch {
      // SecurityCenter2 might not be available (e.g., Windows Server)
      return this.checkWindowsDefenderFallback();
    }
  }

  private checkWindowsDefenderFallback(): CheckResult {
    try {
      const output = execSync(
        'powershell.exe -NoProfile -NonInteractive -Command "Get-MpComputerStatus | Select-Object -Property AntivirusEnabled,RealTimeProtectionEnabled,AntivirusSignatureLastUpdated | ConvertTo-Json"',
        { encoding: 'utf-8', timeout: 15000 },
      ).trim();

      const data = JSON.parse(output);
      const isEnabled = data.AntivirusEnabled === true && data.RealTimeProtectionEnabled === true;

      return {
        checkType: this.checkType,
        passed: isEnabled,
        details: {
          method: 'Get-MpComputerStatus',
          raw: output.substring(0, 500),
          message: isEnabled
            ? 'Windows Defender is active with real-time protection enabled'
            : 'Windows Defender is not active or real-time protection is disabled',
        },
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        checkType: this.checkType,
        passed: false,
        details: {
          method: 'Get-CimInstance + Get-MpComputerStatus',
          raw: error instanceof Error ? error.message : String(error),
          message: 'Unable to determine antivirus status',
        },
        checkedAt: new Date().toISOString(),
      };
    }
  }
}
