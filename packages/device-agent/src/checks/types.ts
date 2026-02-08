import type { CheckResult, DeviceCheckType } from '../shared/types';

/**
 * Interface for a platform-specific compliance check.
 * Each check module must implement this interface.
 */
export interface ComplianceCheck {
  /** The type of check this module performs */
  checkType: DeviceCheckType;

  /** Human-readable name for display */
  displayName: string;

  /** Execute the check and return the result */
  run(): Promise<CheckResult>;
}
