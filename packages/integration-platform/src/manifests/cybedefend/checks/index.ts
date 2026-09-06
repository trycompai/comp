import { TASK_TEMPLATES } from '../../../task-mappings';
import { createProjectFindingsCheck } from './project-findings-check';

/**
 * Static application security testing.
 *
 * Bound to "Sanitized Inputs": the control asks for input validation and
 * sanitization, which is what SAST findings evidence.
 */
export const sastCheck = createProjectFindingsCheck({
  id: 'cybedefend_sast_findings',
  name: 'CybeDefend Code Scanning',
  description:
    'Checks each CybeDefend project for open static-analysis findings on its reference branch.',
  service: 'code-scanning',
  findingType: 'sast',
  taskMapping: TASK_TEMPLATES.sanitizedInputs,
});

/**
 * Software composition analysis.
 *
 * Bound to "Secure Code", the task that asks for "dependabot or its
 * equivalent", dependency vulnerability detection.
 */
export const scaCheck = createProjectFindingsCheck({
  id: 'cybedefend_sca_findings',
  name: 'CybeDefend Dependency Scanning',
  description:
    'Checks each CybeDefend project for open dependency vulnerabilities on its reference branch.',
  service: 'dependency-scanning',
  findingType: 'sca',
  taskMapping: TASK_TEMPLATES.secureCode,
});

export { createProjectFindingsCheck };
