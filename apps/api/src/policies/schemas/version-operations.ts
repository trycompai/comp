import type { ApiOperationOptions } from '@nestjs/swagger';

export const VERSION_OPERATIONS: Record<string, ApiOperationOptions> = {
  getPolicyVersions: {
    summary: 'Get policy versions',
    description:
      'Returns all versions for a policy in descending order. Supports both API key authentication and session authentication.',
  },
  getPolicyVersionById: {
    summary: 'Get policy version by ID',
    description:
      'Returns a single policy version by its ID, including content and metadata.',
  },
  createPolicyVersion: {
    summary: 'Create policy version',
    description:
      'Creates a new draft version of a policy, cloned from the current published version (or a specified source version). Use this when you need to make any change to a published policy — content edits, PDF attachments, anything. Published policies are immutable, so changes always happen on a fresh draft version that you can later publish.',
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
    summary: 'Publish policy version',
    description:
      'Publishes a draft policy version, making it the active/current version of the policy. Pass the versionId of the draft you want to publish — for example one created via create-policy-version and then edited with update-policy-version-content or given a PDF via the upload flow. Omitting versionId may publish stale draft content, so always pass the ID of the draft you actually changed.',
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
