import { db } from '@db';
import { DEFAULT_INTENDED_OUTCOMES } from '../wizard/wizard-defaults';
import { parseStoredAnswers } from '../wizard/wizard-schema';
import type { IsmsKeyValue } from '../utils/export-shared';
import type { IsmsOrgProfile } from './types';

/**
 * Exact onboarding question strings (apps/app/.../setup/lib/constants.ts). The
 * answers are persisted verbatim into the Context Q&A table at signup; we read
 * them back to populate the Context-of-the-Organization overview. Structured
 * answers (C-suite, address) are stored as "[object Object]" and skipped.
 */
const QUESTIONS = {
  describe: 'Describe your company in a few sentences',
  industry: 'What industry is your company in?',
  teamSize: 'How many employees do you have?',
  workLocation: 'How does your team work?',
  dataTypes: 'What types of data do you handle?',
  geo: 'Where is your data located?',
  infrastructure: 'Where do you host your applications and data?',
} as const;

/**
 * Assemble the narrative inputs for the Context of the Organization document:
 * the overview table, the mission statement and the ISMS intended outcomes.
 * Everything is best-effort — any field we cannot resolve is simply omitted so
 * the document degrades gracefully rather than showing blanks.
 */
export async function loadOrgProfile({
  organizationId,
  frameworkId,
}: {
  organizationId: string;
  frameworkId: string;
}): Promise<IsmsOrgProfile> {
  const [organization, contextEntries, profile] = await Promise.all([
    db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, website: true },
    }),
    db.context.findMany({
      where: { organizationId },
      // Deterministic ordering so duplicate questions resolve to the same answer
      // every export; the earliest-created entry wins (id breaks createdAt ties).
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { question: true, answer: true },
    }),
    db.ismsProfile.findUnique({
      where: { organizationId_frameworkId: { organizationId, frameworkId } },
      select: { answers: true },
    }),
  ]);

  // First (earliest-created) entry wins for any duplicated question.
  const answers = new Map<string, string>();
  for (const entry of contextEntries) {
    if (!answers.has(entry.question)) {
      answers.set(entry.question, (entry.answer ?? '').trim());
    }
  }
  const get = (question: string): string | null => {
    const value = answers.get(question);
    return value && value !== '[object Object]' ? value : null;
  };

  const overview: IsmsKeyValue[] = [];
  const add = (label: string, value: string | null) => {
    if (value) overview.push({ label, value });
  };
  add('Legal entity', organization?.name?.trim() || null);
  add('Website', organization?.website?.trim() || null);
  add('Industry', get(QUESTIONS.industry));
  add('Workforce', get(QUESTIONS.teamSize));
  add('Working model', get(QUESTIONS.workLocation));
  add('Data handled', get(QUESTIONS.dataTypes));
  add('Data locations', get(QUESTIONS.geo));
  add('Hosting', get(QUESTIONS.infrastructure));

  const wizard = parseStoredAnswers(profile?.answers);
  const intendedOutcomes =
    wizard.intendedOutcomes && wizard.intendedOutcomes.length > 0
      ? wizard.intendedOutcomes
      : DEFAULT_INTENDED_OUTCOMES;

  return { overview, mission: get(QUESTIONS.describe), intendedOutcomes };
}
