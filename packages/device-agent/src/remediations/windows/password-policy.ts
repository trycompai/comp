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
    // Try multiple methods to set the password policy
    const methods = [
      {
        name: 'net accounts',
        cmd: `powershell.exe -NoProfile -NonInteractive -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c net accounts /minpwlen:${REQUIRED_MIN_LENGTH}' -Verb RunAs -Wait"`,
      },
      {
        name: 'ADSI',
        cmd: `powershell.exe -NoProfile -NonInteractive -Command "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile -NonInteractive -Command \\\"$c=[ADSI]''WinNT://localhost''; $c.MinPasswordLength=${REQUIRED_MIN_LENGTH}; $c.SetInfo()\\\"'"`,
      },
    ];

    for (const method of methods) {
      try {
        execSync(method.cmd, { encoding: 'utf-8', timeout: 60000 });

        return {
          checkType: this.checkType,
          success: true,
          message: `Password policy set: minimum ${REQUIRED_MIN_LENGTH} characters required (via ${method.name})`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // User cancelled the UAC dialog — don't try next method
        if (
          errorMessage.includes('canceled') ||
          errorMessage.includes('The operation was canceled') ||
          errorMessage.includes('cancelled')
        ) {
          return {
            checkType: this.checkType,
            success: false,
            message: 'Admin elevation was cancelled. Please accept the admin prompt to set the password policy.',
          };
        }

        // Try next method
        continue;
      }
    }

    return {
      checkType: this.checkType,
      success: false,
      message: `Failed to set password policy. Try manually: open Terminal as Admin and run "net accounts /minpwlen:${REQUIRED_MIN_LENGTH}"`,
    };
  }
}
