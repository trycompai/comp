import type { PublicOperationMetadata } from './types';

export const TRUST_OPERATION_METADATA: Record<string, PublicOperationMetadata> =
  {
    TrustAccessController_createAccessRequest_v1: {
      summary: 'Submit Trust Access request',
      description:
        'Submit a Trust Center access request with requester details, company context, and review reason for administrator approval.',
    },
    TrustAccessController_listAccessRequests_v1: {
      summary: 'List Trust Access requests',
      description:
        'List pending and completed Trust Center access requests so teams can review customer security inquiries through the API.',
    },
    TrustAccessController_getAccessRequest_v1: {
      summary: 'Get Trust Access request',
      description:
        'Retrieve one Trust Center access request with requester context, status, review metadata, and audit details.',
    },
    TrustAccessController_approveRequest_v1: {
      summary: 'Approve Trust Access request',
      description:
        'Approve a Trust Center access request, configure the grant window, and start the NDA or access email workflow.',
    },
    TrustAccessController_denyRequest_v1: {
      summary: 'Deny Trust Access request',
      description:
        'Reject a Trust Center access request with a review reason so customer security access decisions stay auditable.',
    },
    TrustAccessController_listGrants_v1: {
      summary: 'List Trust Access grants',
      description:
        'List active, expired, and revoked Trust Access grants for customer security reviews and shared compliance resources.',
    },
    TrustAccessController_revokeGrant_v1: {
      summary: 'Revoke Trust Access grant',
      description:
        'Immediately revoke a Trust Access grant when a customer review ends or shared compliance access should be removed.',
    },
    TrustAccessController_resendAccessEmail_v1: {
      summary: 'Resend Trust Access email',
      description:
        'Resend the access email for an active Trust Access grant so approved reviewers can reopen shared resources.',
    },
    TrustAccessController_resendNda_v1: {
      summary: 'Resend Trust Access NDA',
      description:
        'Resend an NDA signing email for a Trust Access request that still requires reviewer signature.',
    },
    TrustAccessController_previewNda_v1: {
      summary: 'Preview Trust Access NDA',
      description:
        'Generate a preview NDA PDF for a Trust Access request before the reviewer signs and receives access.',
    },
    TrustAccessController_reclaimAccess_v1: {
      summary: 'Reclaim Trust Access link',
      description:
        'Request a fresh Trust Access link for a reviewer who already has an active grant on a published Trust Center.',
    },
    TrustAccessController_getNda_v1: {
      summary: 'Get Trust Access NDA',
      description:
        'Internal Trust Portal NDA session endpoint used by the Comp AI frontend during reviewer access flows.',
      visibility: 'excluded',
    },
    TrustAccessController_previewNdaByToken_v1: {
      summary: 'Preview Trust Access NDA by session',
      description:
        'Internal Trust Portal NDA preview endpoint used by the Comp AI frontend during reviewer access flows.',
      visibility: 'excluded',
    },
    TrustAccessController_signNda_v1: {
      summary: 'Sign Trust Access NDA',
      description:
        'Internal Trust Portal NDA signing endpoint used by the Comp AI frontend during reviewer access flows.',
      visibility: 'excluded',
    },
    TrustAccessController_getGrantByAccessToken_v1: {
      summary: 'Get Trust Access grant session',
      description:
        'Internal Trust Portal grant session endpoint used by the Comp AI frontend for reviewer access.',
      visibility: 'excluded',
    },
    TrustAccessController_getPoliciesByAccessToken_v1: {
      summary: 'List Trust Access policies by session',
      description:
        'Internal Trust Portal policy session endpoint used by the Comp AI frontend for reviewer access.',
      visibility: 'excluded',
    },
    TrustAccessController_downloadAllPolicies_v1: {
      summary: 'Download Trust Access policy bundle',
      description:
        'Internal Trust Portal policy bundle endpoint used by the Comp AI frontend for reviewer access.',
      visibility: 'excluded',
    },
    TrustAccessController_getFaqs_v1: {
      summary: 'Get Trust Center FAQs',
      description:
        'Retrieve published Trust Center FAQs for an organization so public trust pages can show customer security answers.',
    },
    TrustAccessController_getPublicOverview_v1: {
      summary: 'Get Trust Center overview',
      description:
        'Retrieve the published Trust Center overview for an organization, including public security posture messaging.',
    },
    TrustAccessController_getPublicCustomLinks_v1: {
      summary: 'List Trust Center custom links',
      description:
        'List published custom links shown on an organization Trust Center for customer security and compliance reviews.',
    },
    TrustAccessController_getPublicFavicon_v1: {
      summary: 'Get Trust Center favicon',
      description:
        'Retrieve the favicon URL used by a published Trust Center so embedded or mirrored experiences can match branding.',
    },
    TrustAccessController_getPublicVendors_v1: {
      summary: 'List Trust Center vendors',
      description:
        'List published vendors and subprocessors for an organization Trust Center so reviewers can inspect third-party posture.',
    },
    TrustPortalController_getSettings_v1: {
      summary: 'Get Trust Center settings',
      description:
        'Retrieve Trust Center settings used to configure public status, custom domains, framework visibility, resources, FAQs, and access rules.',
    },
    TrustPortalController_uploadComplianceResource_v1: {
      summary: 'Upload compliance certificate',
      description:
        'Upload or replace a compliance certificate PDF such as SOC 2, ISO 27001, HIPAA, or GDPR evidence for Trust Center sharing.',
    },
    TrustPortalController_updateOverview_v1: {
      summary: 'Update Trust Center overview',
      description:
        'Update the public Trust Center overview content that explains security posture and compliance status to prospects and customers.',
    },
  };
