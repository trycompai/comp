import type { ApiOperationOptions } from '@nestjs/swagger';

export const VERSION_OPERATIONS: Record<string, ApiOperationOptions> = {
  getPolicyVersions: {
    summary: 'Get policy versions',
    description:
      'Returns all versions for a policy in descending order. Supports both API key authentication and session authentication.',
  },
  createPolicyVersion: {
    summary: 'Create policy version',
    description:
      'Creates a new draft version based on the current published version (or a specified source version).',
  },
  updateVersionContent: {
    summary: 'Update version content',
    description:
      'Updates content for a non-published, non-pending version. Published and pending versions are immutable.',
  },
  deletePolicyVersion: {
    summary: 'Delete policy version',
    description:
      'Deletes a non-published, non-pending version. Published and pending versions cannot be deleted.',
  },
  publishPolicyVersion: {
    summary: 'Publish new policy version',
    description:
      'Publishes draft content as a new version and optionally sets it as active.',
  },
  setActivePolicyVersion: {
    summary: 'Set active policy version',
    description:
      'Marks a version as the active (published) version and updates the policy content.',
  },
  submitVersionForApproval: {
    summary: 'Submit version for approval',
    description:
      'Submits a version for approval by setting pendingVersionId and updating policy status.',
  },
};
