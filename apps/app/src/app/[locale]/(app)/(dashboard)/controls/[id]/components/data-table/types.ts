import type {
  OrganizationControl,
  OrganizationControlRequirement,
  OrganizationEvidence,
  OrganizationPolicy,
} from "@bubba/db";

// Define a type for the data returned by the useOrganizationControlRequirements hook
export type RequirementWithRelations = OrganizationControl & {
  OrganizationControlRequirement: OrganizationControlRequirement & {
    organizationPolicy: OrganizationPolicy;
    organizationEvidence: OrganizationEvidence;
  };
};
