/**
 * Mirrors the PhaseCompletionType enum from packages/db/prisma/schema/timeline.prisma.
 * Defined locally because the API's Prisma client hasn't been regenerated with
 * the timeline schema yet. Values MUST stay in sync with the Prisma enum.
 */
export const PhaseCompletionType = {
  AUTO_TASKS: 'AUTO_TASKS',
  AUTO_POLICIES: 'AUTO_POLICIES',
  AUTO_PEOPLE: 'AUTO_PEOPLE',
  AUTO_FINDINGS: 'AUTO_FINDINGS',
  AUTO_UPLOAD: 'AUTO_UPLOAD',
  MANUAL: 'MANUAL',
} as const;

export type PhaseCompletionType =
  (typeof PhaseCompletionType)[keyof typeof PhaseCompletionType];

export interface DefaultPhaseTemplate {
  name: string;
  description: string;
  groupLabel?: string;
  orderIndex: number;
  defaultDurationWeeks: number;
  completionType: PhaseCompletionType;
  /**
   * When true, completing this phase should lock timeline automation state.
   * This is intended for milestones like SOC 2 Observation Period completion.
   */
  locksTimelineOnComplete?: boolean;
}

export interface DefaultTimelineTemplate {
  frameworkName: string; // Matched against normalized FrameworkEditorFramework.name
  name: string; // Display name, e.g. "SOC 2 Type 2"
  cycleNumber: number;
  /**
   * Independent track identifier within a framework.
   * Example: SOC 2 has separate tracks for Type 1 and Type 2.
   */
  trackKey?: string;
  /**
   * Stable key to identify this template's semantic meaning.
   * Enables deterministic transitions across cycles.
   */
  templateKey?: string;
  /**
   * Stable key for which template should be used on "next cycle".
   */
  nextTemplateKey?: string;
  phases: DefaultPhaseTemplate[];
}

export const DEFAULT_TIMELINE_TEMPLATES: DefaultTimelineTemplate[] = [
  // SOC 2 Type 1 - quick point-in-time snapshot (cycle 1)
  {
    frameworkName: 'SOC 2',
    name: 'SOC 2 Type 1',
    cycleNumber: 1,
    trackKey: 'soc2_type1',
    templateKey: 'soc2_type1',
    nextTemplateKey: 'soc2_type1',
    phases: [
      {
        name: 'Policies',
        description: 'Review and publish all required compliance policies.',
        groupLabel: 'Preparing for Audit',
        orderIndex: 0,
        defaultDurationWeeks: 3,
        completionType: PhaseCompletionType.AUTO_POLICIES,
      },
      {
        name: 'Evidence',
        description: 'Complete all evidence collection tasks.',
        groupLabel: 'Preparing for Audit',
        orderIndex: 1,
        defaultDurationWeeks: 4,
        completionType: PhaseCompletionType.AUTO_TASKS,
      },
      {
        name: 'People',
        description: 'Ensure all employees complete security training and acknowledgements.',
        groupLabel: 'Preparing for Audit',
        orderIndex: 2,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.AUTO_PEOPLE,
      },
      {
        name: 'Auditor Review',
        description: 'Auditor reviews your account.',
        orderIndex: 3,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.AUTO_FINDINGS,
      },
      {
        name: 'Draft Report',
        description: 'Auditor delivers draft report for review.',
        orderIndex: 4,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.MANUAL,
      },
      {
        name: 'Final Report',
        description: 'Final report delivered.',
        orderIndex: 5,
        defaultDurationWeeks: 1,
        completionType: PhaseCompletionType.AUTO_UPLOAD,
      },
    ],
  },

  // SOC 2 Type 2 (cycle 1 in its own track)
  {
    frameworkName: 'SOC 2',
    name: 'SOC 2 Type 2',
    cycleNumber: 1,
    trackKey: 'soc2_type2',
    templateKey: 'soc2_type2_year1',
    nextTemplateKey: 'soc2_type2_renewal',
    phases: [
      {
        name: 'Policies',
        description:
          'Review and publish all required compliance policies.',
        groupLabel: 'Preparing for Audit',
        orderIndex: 0,
        defaultDurationWeeks: 3,
        completionType: PhaseCompletionType.AUTO_POLICIES,
      },
      {
        name: 'Evidence',
        description: 'Complete all evidence collection tasks.',
        groupLabel: 'Preparing for Audit',
        orderIndex: 1,
        defaultDurationWeeks: 4,
        completionType: PhaseCompletionType.AUTO_TASKS,
      },
      {
        name: 'People',
        description:
          'Ensure all employees complete security training and acknowledgements.',
        groupLabel: 'Preparing for Audit',
        orderIndex: 2,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.AUTO_PEOPLE,
      },
      {
        name: 'Observation Period + Pentest',
        description:
          'Observation period to prove sustained compliance. Penetration test is arranged during this phase.',
        orderIndex: 3,
        defaultDurationWeeks: 4,
        completionType: PhaseCompletionType.MANUAL,
        locksTimelineOnComplete: true,
      },
      {
        name: 'Auditor Review',
        description: 'Auditor reviews evidence and addresses any feedback.',
        orderIndex: 4,
        defaultDurationWeeks: 4,
        completionType: PhaseCompletionType.AUTO_FINDINGS,
      },
      {
        name: 'Draft Report',
        description: 'Auditor delivers draft report for review.',
        orderIndex: 5,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.MANUAL,
      },
      {
        name: 'Final Report',
        description:
          'Final report delivered. Your SOC 2 Type 2 certification is complete.',
        orderIndex: 6,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.AUTO_UPLOAD,
      },
    ],
  },

  // SOC 2 Type 2 renewal (cycle 2+ in the same Type 2 track)
  {
    frameworkName: 'SOC 2',
    name: 'SOC 2 Type 2',
    cycleNumber: 2,
    trackKey: 'soc2_type2',
    templateKey: 'soc2_type2_renewal',
    nextTemplateKey: 'soc2_type2_renewal',
    phases: [
      {
        name: 'Policies',
        description:
          'Review and publish all required compliance policies.',
        groupLabel: 'Preparing for Audit',
        orderIndex: 0,
        defaultDurationWeeks: 3,
        completionType: PhaseCompletionType.AUTO_POLICIES,
      },
      {
        name: 'Evidence',
        description: 'Complete all evidence collection tasks.',
        groupLabel: 'Preparing for Audit',
        orderIndex: 1,
        defaultDurationWeeks: 4,
        completionType: PhaseCompletionType.AUTO_TASKS,
      },
      {
        name: 'People',
        description:
          'Ensure all employees complete security training and acknowledgements.',
        groupLabel: 'Preparing for Audit',
        orderIndex: 2,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.AUTO_PEOPLE,
      },
      {
        name: 'Observation Period + Pentest',
        description:
          'Observation period to prove sustained compliance. Penetration test is arranged during this phase.',
        orderIndex: 3,
        defaultDurationWeeks: 18,
        completionType: PhaseCompletionType.MANUAL,
        locksTimelineOnComplete: true,
      },
      {
        name: 'Auditor Review',
        description: 'Auditor reviews evidence and addresses any feedback.',
        orderIndex: 4,
        defaultDurationWeeks: 4,
        completionType: PhaseCompletionType.AUTO_FINDINGS,
      },
      {
        name: 'Draft Report',
        description: 'Auditor delivers draft report for review.',
        orderIndex: 5,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.MANUAL,
      },
      {
        name: 'Final Report',
        description:
          'Final report delivered. Your SOC 2 Type 2 renewal is complete.',
        orderIndex: 6,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.AUTO_UPLOAD,
      },
    ],
  },

  // SOC 2 v.1 (legacy separate framework - same as Type 1)
  {
    frameworkName: 'SOC 2 v.1',
    name: 'SOC 2 Type 1',
    cycleNumber: 1,
    trackKey: 'soc2v1_type1',
    templateKey: 'soc2v1_type1',
    nextTemplateKey: 'soc2v1_type1',
    phases: [
      {
        name: 'Evidence Gathering',
        description:
          'Complete all platform tasks. This is a point-in-time snapshot assessment.',
        orderIndex: 0,
        defaultDurationWeeks: 8,
        completionType: PhaseCompletionType.AUTO_TASKS,
      },
      {
        name: 'Auditor Review',
        description: 'Auditor reviews your account.',
        orderIndex: 1,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.AUTO_FINDINGS,
      },
      {
        name: 'Final Report',
        description: 'Final report delivered.',
        orderIndex: 2,
        defaultDurationWeeks: 1,
        completionType: PhaseCompletionType.AUTO_UPLOAD,
      },
    ],
  },

  // ISO 27001
  {
    frameworkName: 'ISO27001',
    name: 'ISO 27001',
    cycleNumber: 1,
    trackKey: 'primary',
    templateKey: 'iso27001_primary',
    nextTemplateKey: 'iso27001_primary',
    phases: [
      {
        name: 'Evidence Gathering',
        description:
          'Complete all platform tasks and employee requirements.',
        orderIndex: 0,
        defaultDurationWeeks: 8,
        completionType: PhaseCompletionType.AUTO_TASKS,
      },
      {
        name: 'Stage 1 & 2 Audit',
        description:
          'Auditor conducts Stage 1 (Policy) and Stage 2 (Evidence) reviews.',
        orderIndex: 1,
        defaultDurationWeeks: 5,
        completionType: PhaseCompletionType.MANUAL,
      },
      {
        name: 'Certification',
        description: 'Certification delivered.',
        orderIndex: 2,
        defaultDurationWeeks: 1,
        completionType: PhaseCompletionType.AUTO_UPLOAD,
      },
    ],
  },

  // HIPAA
  {
    frameworkName: 'HIPAA',
    name: 'HIPAA',
    cycleNumber: 1,
    trackKey: 'primary',
    templateKey: 'hipaa_primary',
    nextTemplateKey: 'hipaa_primary',
    phases: [
      {
        name: 'Evidence Gathering & Training',
        description:
          'Complete all platform tasks, evidence, and employee training.',
        orderIndex: 0,
        defaultDurationWeeks: 8,
        completionType: PhaseCompletionType.AUTO_TASKS,
      },
      {
        name: 'Review',
        description:
          'We review your compliance and address any findings.',
        orderIndex: 1,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.MANUAL,
      },
      {
        name: 'Attestation',
        description: 'Attestation report delivered.',
        orderIndex: 2,
        defaultDurationWeeks: 1,
        completionType: PhaseCompletionType.AUTO_UPLOAD,
      },
    ],
  },

  // GDPR
  {
    frameworkName: 'GDPR',
    name: 'GDPR',
    cycleNumber: 1,
    trackKey: 'primary',
    templateKey: 'gdpr_primary',
    nextTemplateKey: 'gdpr_primary',
    phases: [
      {
        name: 'Evidence Gathering & Training',
        description:
          'Complete all platform tasks, evidence, and employee training.',
        orderIndex: 0,
        defaultDurationWeeks: 8,
        completionType: PhaseCompletionType.AUTO_TASKS,
      },
      {
        name: 'Review',
        description:
          'We review your compliance and address any findings.',
        orderIndex: 1,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.MANUAL,
      },
      {
        name: 'Attestation',
        description: 'Attestation report delivered.',
        orderIndex: 2,
        defaultDurationWeeks: 1,
        completionType: PhaseCompletionType.AUTO_UPLOAD,
      },
    ],
  },
];

/**
 * Fallback used when a framework has no explicit code-default timeline.
 * This provides a safe, editable baseline for CX/admin teams.
 */
export const GENERIC_DEFAULT_TIMELINE_TEMPLATE: DefaultTimelineTemplate = {
  frameworkName: '*',
  name: 'Baseline Compliance Timeline',
  cycleNumber: 1,
  trackKey: 'primary',
  templateKey: 'baseline_primary',
  nextTemplateKey: 'baseline_primary',
  phases: [
    {
      name: 'Scoping & Planning',
      description: 'Define scope, owners, and audit goals for this cycle.',
      orderIndex: 0,
      defaultDurationWeeks: 2,
      completionType: PhaseCompletionType.MANUAL,
    },
    {
      name: 'Evidence Collection',
      description: 'Collect required evidence and complete implementation tasks.',
      orderIndex: 1,
      defaultDurationWeeks: 6,
      completionType: PhaseCompletionType.MANUAL,
    },
    {
      name: 'Internal Review',
      description: 'Validate readiness and resolve open findings before external review.',
      orderIndex: 2,
      defaultDurationWeeks: 2,
      completionType: PhaseCompletionType.MANUAL,
    },
    {
      name: 'Final Report',
      description: 'Upload final attestation, report, or certification deliverable.',
      orderIndex: 3,
      defaultDurationWeeks: 1,
      completionType: PhaseCompletionType.AUTO_UPLOAD,
    },
  ],
};

function normalizeFrameworkName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Find matching default templates for a framework by name.
 * Returns all matching templates (could be multiple for different cycle numbers).
 */
export function getDefaultTemplatesForFramework(
  frameworkName: string,
): DefaultTimelineTemplate[] {
  const normalized = normalizeFrameworkName(frameworkName);
  return DEFAULT_TIMELINE_TEMPLATES.filter(
    (t) => normalizeFrameworkName(t.frameworkName) === normalized,
  );
}

/**
 * Find a specific default template for a framework and cycle number.
 * Falls back to highest cycle number <= requested (same as DB fallback logic).
 */
export function getDefaultTemplateForCycle(
  frameworkName: string,
  cycleNumber: number,
  options?: { trackKey?: string },
): DefaultTimelineTemplate | undefined {
  const trackKey = options?.trackKey;
  const templatesForFramework = getDefaultTemplatesForFramework(frameworkName);
  const trackScopedTemplates = trackKey
    ? templatesForFramework.filter((t) => (t.trackKey ?? 'primary') === trackKey)
    : templatesForFramework;
  const templates =
    trackScopedTemplates.length > 0
      ? trackScopedTemplates
      : templatesForFramework;

  // Unknown framework: use a generic baseline that admins can customize.
  if (templates.length === 0) {
    if (cycleNumber < GENERIC_DEFAULT_TIMELINE_TEMPLATE.cycleNumber) {
      return undefined;
    }
    return {
      ...GENERIC_DEFAULT_TIMELINE_TEMPLATE,
      phases: GENERIC_DEFAULT_TIMELINE_TEMPLATE.phases.map((phase) => ({ ...phase })),
    };
  }

  // Exact match first
  const exact = templates.find((t) => t.cycleNumber === cycleNumber);
  if (exact) return exact;

  // Fallback to highest cycle <= requested
  return templates
    .filter((t) => t.cycleNumber <= cycleNumber)
    .sort((a, b) => b.cycleNumber - a.cycleNumber)[0];
}
