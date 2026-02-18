import type { DeviceCheckType, RemediationInfo, RemediationResult } from '../shared/types';

/**
 * Interface for a platform-specific compliance remediation.
 * Each remediation module must implement this interface.
 */
export interface ComplianceRemediation {
  /** The type of check this remediation addresses */
  checkType: DeviceCheckType;

  /** Returns information about this remediation (type, admin requirement, instructions) */
  getInfo(): RemediationInfo;

  /** Attempt to remediate the failing check */
  remediate(): Promise<RemediationResult>;
}
