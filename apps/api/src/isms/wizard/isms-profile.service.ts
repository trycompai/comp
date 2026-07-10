import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type { IsmsDocumentType, Prisma } from '@db';
import { IsmsService } from '../isms.service';
import { IsmsContextService } from '../isms-context.service';
import { collectPlatformData } from '../documents/data-source';
import { computeWizardDefaults } from './wizard-defaults';
import { mergeWizardAnswers } from './merge-answers';
import {
  parseStoredAnswers,
  wizardAnswersSchema,
  type PartialWizardAnswers,
} from './wizard-schema';

/** A member option surfaced for the Deputy SPO / sign-off pickers. */
export interface WizardMemberOption {
  id: string;
  name: string;
}

/**
 * Deterministic generation order for generateAll. The Parties register MUST be
 * generated before the Requirements register, since requirements derive from
 * the persisted parties; an unordered findMany could regenerate requirements
 * against a stale/empty register. Lower number = generated first; unlisted
 * types fall back to GENERATION_ORDER_DEFAULT.
 */
const GENERATION_ORDER: Record<IsmsDocumentType, number> = {
  context_of_organization: 0,
  interested_parties_register: 1,
  interested_parties_requirements: 2,
  isms_scope: 3,
  leadership_commitment: 4,
  roles_and_responsibilities: 5,
  objectives_plan: 6,
};
const GENERATION_ORDER_DEFAULT = Object.keys(GENERATION_ORDER).length;

/**
 * IsmsProfile lifecycle: get-or-init, partial save, completion, and the
 * wizard-driven generate-all. One profile row per org + framework. The answers
 * JSON is validated against the shared wizard Zod schema on read and write.
 */
@Injectable()
export class IsmsProfileService {
  constructor(
    private readonly ismsService: IsmsService,
    private readonly contextService: IsmsContextService,
  ) {}

  /**
   * Return the saved answers (or null), the computed pre-population defaults, and
   * the member options. Ensures the profile row exists (get-or-init), mirroring
   * ensure-setup, so the wizard always has a row to PATCH against.
   */
  async getProfile({
    organizationId,
    frameworkId,
  }: {
    organizationId: string;
    frameworkId: string;
  }): Promise<{
    answers: PartialWizardAnswers | null;
    defaults: Awaited<ReturnType<typeof computeWizardDefaults>>;
    members: WizardMemberOption[];
  }> {
    await this.requireFramework({ frameworkId });

    const profile = await this.ensureProfile({ organizationId, frameworkId });
    const [defaults, members] = await Promise.all([
      computeWizardDefaults({ organizationId, frameworkId }),
      this.listMembers({ organizationId }),
    ]);

    const stored = parseStoredAnswers(profile.answers);
    const hasAnswers = Object.keys(stored).length > 0;

    return {
      answers: hasAnswers ? stored : null,
      defaults,
      members,
    };
  }

  /**
   * Merge a partial answers payload onto the stored answers and save. When
   * `complete` is true the merged result is validated against the full schema and
   * completedAt is set.
   */
  async saveProfile({
    organizationId,
    frameworkId,
    answers,
    complete,
  }: {
    organizationId: string;
    frameworkId: string;
    answers: PartialWizardAnswers;
    complete: boolean;
  }) {
    await this.requireFramework({ frameworkId });

    const profile = await this.ensureProfile({ organizationId, frameworkId });
    const stored = parseStoredAnswers(profile.answers);
    const merged = mergeWizardAnswers({ stored, incoming: answers });

    if (complete) {
      wizardAnswersSchema.parse(merged);
    }

    const serialized: Prisma.InputJsonValue = JSON.parse(JSON.stringify(merged));

    const updated = await db.ismsProfile.update({
      where: { id: profile.id },
      data: {
        answers: serialized,
        completedAt: complete ? new Date() : profile.completedAt,
      },
    });

    return {
      id: updated.id,
      answers: parseStoredAnswers(updated.answers),
      completedAt: updated.completedAt,
    };
  }

  /**
   * Ensure every ISMS document exists, then regenerate each from the latest
   * profile + platform data. Called by the wizard on completion so every document
   * reflects the answers just saved. Returns the regenerated documents.
   */
  async generateAll({
    organizationId,
    frameworkId,
  }: {
    organizationId: string;
    frameworkId: string;
  }) {
    await this.requireFramework({ frameworkId });

    // The wizard is an evidence:update flow, so it always provisions.
    await this.ismsService.ensureSetup({
      organizationId,
      frameworkId,
      canWrite: true,
    });

    const documents = await db.ismsDocument.findMany({
      where: { organizationId, frameworkId },
      select: { id: true, type: true },
    });
    const ordered = [...documents].sort(
      (a, b) =>
        (GENERATION_ORDER[a.type] ?? GENERATION_ORDER_DEFAULT) -
        (GENERATION_ORDER[b.type] ?? GENERATION_ORDER_DEFAULT),
    );

    // Collect the expensive platform snapshot once and reuse it across every
    // document, instead of re-querying it per document inside generate().
    const data = await collectPlatformData({ organizationId, frameworkId });

    type GeneratedDocument = Awaited<
      ReturnType<IsmsContextService['generate']>
    >;
    const generated: GeneratedDocument[] = [];
    for (const doc of ordered) {
      const result = await this.contextService.generate({
        documentId: doc.id,
        organizationId,
        data,
      });
      generated.push(result);
    }

    return { success: true, documents: generated };
  }

  private async ensureProfile({
    organizationId,
    frameworkId,
  }: {
    organizationId: string;
    frameworkId: string;
  }) {
    const empty: Prisma.InputJsonValue = {};
    // Idempotent: concurrent callers can't trip the unique constraint.
    return db.ismsProfile.upsert({
      where: { organizationId_frameworkId: { organizationId, frameworkId } },
      update: {},
      create: { organizationId, frameworkId, answers: empty },
    });
  }

  private async listMembers({
    organizationId,
  }: {
    organizationId: string;
  }): Promise<WizardMemberOption[]> {
    const members = await db.member.findMany({
      where: { organizationId, deactivated: false },
      select: { id: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((member) => ({
      id: member.id,
      name: member.user?.name || member.user?.email || 'Unknown member',
    }));
  }

  private async requireFramework({ frameworkId }: { frameworkId: string }) {
    const framework = await db.frameworkEditorFramework.findUnique({
      where: { id: frameworkId },
      select: { id: true },
    });
    if (!framework) {
      throw new NotFoundException('Framework not found');
    }
    return framework;
  }
}
