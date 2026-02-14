import { execSync } from 'node:child_process';
import type { CheckResult } from '../../shared/types';
import type { ComplianceCheck } from '../types';

const REQUIRED_MIN_LENGTH = 8;

/**
 * Checks if a minimum password length policy (>= 8 characters) is enforced on Windows.
 *
 * Uses multiple locale-independent detection methods:
 *  1. ADSI WinNT provider (locale-independent, no admin needed)
 *  2. `net accounts` with broad regex parsing
 *  3. `secedit /export` as fallback (may need admin)
 */
export class WindowsPasswordPolicyCheck implements ComplianceCheck {
  checkType = 'password_policy' as const;
  displayName = 'Password Policy (Min 8 Characters)';

  async run(): Promise<CheckResult> {
    // Method 1: ADSI — locale-independent, works without admin
    const adsiResult = this.checkAdsi();
    if (adsiResult !== null) return adsiResult;

    // Method 2: net accounts — works without admin but output is localized
    const netResult = this.checkNetAccounts();
    if (netResult !== null) return netResult;

    // Method 3: secedit — locale-independent but may require admin
    const seceditResult = this.checkSecedit();
    if (seceditResult !== null) return seceditResult;

    return {
      checkType: this.checkType,
      passed: false,
      details: {
        method: 'ADSI + net accounts + secedit',
        raw: 'All methods failed',
        message: 'Could not determine password policy. Try running the agent as Administrator.',
      },
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Uses ADSI WinNT provider to read MinPasswordLength.
   * Locale-independent and doesn't require admin.
   */
  private checkAdsi(): CheckResult | null {
    try {
      const output = execSync(
        `powershell.exe -NoProfile -NonInteractive -Command "([ADSI]'WinNT://localhost').MinPasswordLength.Value"`,
        { encoding: 'utf-8', timeout: 10000 },
      ).trim();

      const minLength = parseInt(output, 10);
      if (isNaN(minLength)) return null;

      const passed = minLength >= REQUIRED_MIN_LENGTH;

      return {
        checkType: this.checkType,
        passed,
        details: {
          method: 'ADSI WinNT',
          raw: `MinPasswordLength: ${minLength}`,
          message: passed
            ? `Password policy enforces minimum ${minLength} characters`
            : `Password policy requires only ${minLength} characters (minimum ${REQUIRED_MIN_LENGTH} required)`,
        },
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Uses `net accounts` and parses the output.
   * Tries both English regex and a position-based fallback for non-English locales.
   */
  private checkNetAccounts(): CheckResult | null {
    try {
      const output = execSync('net accounts', {
        encoding: 'utf-8',
        timeout: 10000,
      }).trim();

      // Try English regex first
      const englishMatch = output.match(/minimum password length\s+(\d+)/i);
      if (englishMatch) {
        return this.buildResult('net accounts', output, parseInt(englishMatch[1], 10));
      }

      // Locale-independent fallback: password min length is typically the 4th data line.
      // Parse all lines that end with a number or "None"/"Never" and take the 4th one.
      const lines = output
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('--'));

      // Look for the line with just a number (min password length is usually 0 on default)
      // The structure is consistent: each line has a label followed by spaces and a value
      for (const line of lines) {
        const match = line.match(/\s+(\d+)\s*$/);
        if (match) {
          const value = parseInt(match[1], 10);
          // The minimum password length line typically has a small number (0-128)
          // and is the 4th line in net accounts output
          const lineIndex = lines.indexOf(line);
          if (lineIndex === 3) {
            return this.buildResult('net accounts (position)', output, value);
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Uses secedit to export and parse security policy.
   * Locale-independent. May require admin on some configurations.
   */
  private checkSecedit(): CheckResult | null {
    try {
      const output = execSync(
        `powershell.exe -NoProfile -NonInteractive -Command "$f='$env:TEMP\\compcheck.cfg'; secedit /export /cfg $f /quiet 2>$null; $c=Get-Content $f -ErrorAction SilentlyContinue; Remove-Item $f -ErrorAction SilentlyContinue; ($c | Select-String 'MinimumPasswordLength\\s*=\\s*(\\d+)').Matches[0].Groups[1].Value"`,
        { encoding: 'utf-8', timeout: 15000 },
      ).trim();

      const minLength = parseInt(output, 10);
      if (isNaN(minLength)) return null;

      return this.buildResult('secedit', `MinimumPasswordLength: ${minLength}`, minLength);
    } catch {
      return null;
    }
  }

  private buildResult(method: string, raw: string, minLength: number): CheckResult {
    const passed = minLength >= REQUIRED_MIN_LENGTH;
    return {
      checkType: this.checkType,
      passed,
      details: {
        method,
        raw: raw.substring(0, 500),
        message: passed
          ? `Password policy enforces minimum ${minLength} characters`
          : `Password policy requires only ${minLength} characters (minimum ${REQUIRED_MIN_LENGTH} required)`,
      },
      checkedAt: new Date().toISOString(),
    };
  }
}
