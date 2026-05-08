// Shape of FrameworkVersion.manifest. Must match the structure produced by
// the backfill script (packages/db/src/scripts/backfill-framework-versions.ts)
// and the manifest builder (framework-manifest-builder.ts).

export interface FrameworkManifest {
  framework: {
    id: string;
    name: string;
    catalogVersion: string;
    description: string | null;
  };
  requirements: ManifestRequirement[];
  controls: ManifestControl[];
  policies: ManifestPolicy[];
  tasks: ManifestTask[];
}

export interface ManifestRequirement {
  id: string; // frk_rq_*
  identifier: string; // e.g. "CC6.1"
  name: string;
  description: string | null;
}

export interface ManifestControl {
  id: string; // frk_ct_*
  name: string;
  description: string;
  requirementIds: string[];
  policyIds: string[];
  taskIds: string[];
  documentTypes: string[]; // EvidenceFormType enum values
}

export interface ManifestPolicy {
  id: string; // frk_pt_*
  name: string;
  description: string | null;
  content: unknown; // TipTap JSON — opaque here
  frequency: string | null;
  department: string | null;
}

export interface ManifestTask {
  id: string; // frk_tt_*
  name: string;
  description: string;
  frequency: string | null;
  department: string | null;
}
