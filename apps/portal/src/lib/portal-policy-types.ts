import type { Policy, PolicyVersion } from '@db';

/** Only published employee-facing fields may cross the server/client boundary. */
export type PortalPolicy = Pick<
  Policy,
  | 'id'
  | 'organizationId'
  | 'name'
  | 'description'
  | 'status'
  | 'content'
  | 'pdfUrl'
  | 'displayFormat'
  | 'signedBy'
  | 'updatedAt'
> & {
  currentVersion: Pick<PolicyVersion, 'id' | 'policyId' | 'content' | 'pdfUrl' | 'version'> | null;
};
