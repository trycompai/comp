export interface UpdateOrganizationDto {
  name?: string;
  slug?: string;
  logo?: string;
  metadata?: string;
  website?: string;
  onboardingCompleted?: boolean;
  hasAccess?: boolean;
  fleetDmLabelId?: number;
  isFleetSetupCompleted?: boolean;
  primaryColor?: string;
}
