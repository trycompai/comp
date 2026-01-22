export type TrustAccessRequest = {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  jobTitle?: string | null;
  purpose?: string | null;
  requestedDurationDays?: number | null;
  requestedScopes: string[];
  status: 'under_review' | 'approved' | 'denied' | 'canceled';
  reviewer?: {
    id: string;
    user: { name: string | null; email: string };
  } | null;
  grant?: {
    id: string;
    status: 'active' | 'expired' | 'revoked';
    expiresAt: string | null;
  } | null;
  createdAt: string;
  reviewedAt?: string | null;
  decisionReason?: string | null;
};

export type TrustAccessGrant = {
  id: string;
  subjectEmail: string;
  scopes: string[];
  status: 'active' | 'expired' | 'revoked';
  expiresAt: string;
  accessRequestId: string;
  revokedAt?: string | null;
  revokeReason?: string | null;
  createdAt: string;
};
