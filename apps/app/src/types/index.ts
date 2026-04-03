export interface SearchParams {
  [key: string]: string | string[] | undefined;
}

/**
 * Organization shape returned by the `/v1/auth/me` API endpoint.
 * This is a subset of the full Prisma Organization model, containing
 * only the fields needed for org switching and display.
 */
export interface OrganizationFromMe {
  id: string;
  name: string;
  logo: string | null;
  onboardingCompleted: boolean;
  hasAccess: boolean;
  createdAt: string;
  memberRole: string;
  memberId: string;
}
