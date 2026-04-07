/**
 * Mirrors the PhaseCompletionType enum from packages/db/prisma/schema/timeline.prisma.
 * Defined locally because the API's Prisma client hasn't been regenerated with
 * the timeline schema yet. Values MUST stay in sync with the Prisma enum.
 */
export const PhaseCompletionType = {
  AUTO_TASKS: 'AUTO_TASKS',
  AUTO_UPLOAD: 'AUTO_UPLOAD',
  MANUAL: 'MANUAL',
} as const;

export type PhaseCompletionType =
  (typeof PhaseCompletionType)[keyof typeof PhaseCompletionType];

export interface DefaultPhaseTemplate {
  name: string;
  description: string;
  orderIndex: number;
  defaultDurationWeeks: number;
  completionType: PhaseCompletionType;
}

export interface DefaultTimelineTemplate {
  frameworkName: string; // Used to match against FrameworkEditorFramework.name
  name: string; // Display name, e.g. "SOC 2 Type 2 — Year 1"
  cycleNumber: number;
  phases: DefaultPhaseTemplate[];
}

export const DEFAULT_TIMELINE_TEMPLATES: DefaultTimelineTemplate[] = [
  // SOC 2 Type 2 — Year 1
  {
    frameworkName: 'SOC 2',
    name: 'SOC 2 Type 2 — Year 1',
    cycleNumber: 1,
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
        name: 'Audit Review',
        description:
          'Auditor reviews evidence. Penetration test is arranged during this phase.',
        orderIndex: 1,
        defaultDurationWeeks: 4,
        completionType: PhaseCompletionType.MANUAL,
      },
      {
        name: 'Draft Report',
        description:
          'Auditor delivers draft report for review. Request any changes before the final version.',
        orderIndex: 2,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.MANUAL,
      },
      {
        name: 'Final Report',
        description:
          'Final report delivered. Your SOC 2 Type 2 certification is complete.',
        orderIndex: 3,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.AUTO_UPLOAD,
      },
    ],
  },

  // SOC 2 Type 2 — Year 2+
  {
    frameworkName: 'SOC 2',
    name: 'SOC 2 Type 2 — Year 2+',
    cycleNumber: 2,
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
        name: 'Observation Period',
        description:
          '6-month observation period to prove sustained compliance.',
        orderIndex: 1,
        defaultDurationWeeks: 18,
        completionType: PhaseCompletionType.MANUAL,
      },
      {
        name: 'Draft Report',
        description: 'Auditor delivers draft report for review.',
        orderIndex: 2,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.MANUAL,
      },
      {
        name: 'Final Report',
        description:
          'Final report delivered. Your SOC 2 Type 2 renewal is complete.',
        orderIndex: 3,
        defaultDurationWeeks: 2,
        completionType: PhaseCompletionType.AUTO_UPLOAD,
      },
    ],
  },

  // SOC 2 Type 1
  {
    frameworkName: 'SOC 2 v.1',
    name: 'SOC 2 Type 1',
    cycleNumber: 1,
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
        completionType: PhaseCompletionType.MANUAL,
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
        name: 'Certification',
        description: 'Certification/report delivered.',
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
        name: 'Certification',
        description: 'Certification/report delivered.',
        orderIndex: 2,
        defaultDurationWeeks: 1,
        completionType: PhaseCompletionType.AUTO_UPLOAD,
      },
    ],
  },
];

/**
 * Find matching default templates for a framework by name.
 * Returns all matching templates (could be multiple for different cycle numbers).
 */
export function getDefaultTemplatesForFramework(
  frameworkName: string,
): DefaultTimelineTemplate[] {
  return DEFAULT_TIMELINE_TEMPLATES.filter(
    (t) => t.frameworkName.toLowerCase() === frameworkName.toLowerCase(),
  );
}

/**
 * Find a specific default template for a framework and cycle number.
 * Falls back to highest cycle number <= requested (same as DB fallback logic).
 */
export function getDefaultTemplateForCycle(
  frameworkName: string,
  cycleNumber: number,
): DefaultTimelineTemplate | undefined {
  const templates = getDefaultTemplatesForFramework(frameworkName);

  // Exact match first
  const exact = templates.find((t) => t.cycleNumber === cycleNumber);
  if (exact) return exact;

  // Fallback to highest cycle <= requested
  return templates
    .filter((t) => t.cycleNumber <= cycleNumber)
    .sort((a, b) => b.cycleNumber - a.cycleNumber)[0];
}
