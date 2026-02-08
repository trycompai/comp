import { execSync } from 'node:child_process';
import type { RemediationInfo, RemediationResult } from '../../shared/types';
import { getInstructions } from '../instructions';
import type { ComplianceRemediation } from '../types';

const REQUIRED_MIN_LENGTH = 8;

/**
 * Windows password policy remediation.
 * Uses PowerShell Start-Process with -Verb RunAs to trigger a UAC prompt,
 * then runs `net accounts /minpwlen:8` with admin privileges.
 */
export class WindowsPasswordPolicyRemediation implements ComplianceRemediation {
  checkType = 'password_policy' as const;

  getInfo(): RemediationInfo {
    const { description, steps } = getInstructions('windows', 'password_policy');
    return {
      checkType: this.checkType,
      available: true,
      type: 'admin_fix',
      requiresAdmin: true,
      description,
      instructions: steps,
    };
  }

  async remediate(): Promise<RemediationResult> {
    try {
      // Use Start-Process -Verb RunAs to trigger UAC elevation
      // -Wait ensures we wait for completion, -PassThru gives us the process object
      const command = `net accounts /minpwlen:${REQUIRED_MIN_LENGTH}`;
      execSync(
        `powershell.exe -NoProfile -NonInteractive -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c ${command}' -Verb RunAs -Wait"`,
        { encoding: 'utf-8', timeout: 60000 }, // 60s timeout to allow for UAC prompt
      );

      return {
        checkType: this.checkType,
        success: true,
        message: `Password policy set: minimum ${REQUIRED_MIN_LENGTH} characters required`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // User cancelled the UAC dialog
      if (
        errorMessage.includes('canceled') ||
        errorMessage.includes('The operation was canceled')
      ) {
        return {
          checkType: this.checkType,
          success: false,
          message: 'UAC elevation was cancelled by the user',
        };
      }

      return {
        checkType: this.checkType,
        success: false,
        message: `Failed to set password policy: ${errorMessage}`,
      };
    }
  }
}
