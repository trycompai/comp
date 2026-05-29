import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import { CreateContextIssueDto } from './dto/create-context-issue.dto';
import { UpdateContextIssueDto } from './dto/update-context-issue.dto';

/**
 * CRUD for the Context-of-the-Organization (clause 4.1) issue register. Derived
 * rows are written by IsmsService.generate; this service handles manual edits and
 * overrides. Editing a derived row flips its source to 'manual' so the override is
 * preserved across regeneration.
 */
@Injectable()
export class IsmsContextIssueService {
  async create({
    documentId,
    organizationId,
    dto,
  }: {
    documentId: string;
    organizationId: string;
    dto: CreateContextIssueDto;
  }) {
    await this.requireDocument({ documentId, organizationId });
    const position =
      dto.position ??
      (await db.ismsContextIssue.count({ where: { documentId } }));

    return db.ismsContextIssue.create({
      data: {
        documentId,
        kind: dto.kind,
        description: dto.description,
        effect: dto.effect,
        source: 'manual',
        position,
      },
    });
  }

  async update({
    issueId,
    organizationId,
    dto,
  }: {
    issueId: string;
    organizationId: string;
    dto: UpdateContextIssueDto;
  }) {
    await this.requireIssue({ issueId, organizationId });

    return db.ismsContextIssue.update({
      where: { id: issueId },
      data: {
        kind: dto.kind ?? undefined,
        description: dto.description ?? undefined,
        effect: dto.effect ?? undefined,
        position: dto.position ?? undefined,
        // Editing a derived row records the override by flipping it to manual.
        source: 'manual',
      },
    });
  }

  async remove({
    issueId,
    organizationId,
  }: {
    issueId: string;
    organizationId: string;
  }) {
    await this.requireIssue({ issueId, organizationId });
    await db.ismsContextIssue.delete({ where: { id: issueId } });
    return { success: true };
  }

  private async requireDocument({
    documentId,
    organizationId,
  }: {
    documentId: string;
    organizationId: string;
  }) {
    const document = await db.ismsDocument.findFirst({
      where: { id: documentId, organizationId },
    });
    if (!document) {
      throw new NotFoundException('ISMS document not found');
    }
    return document;
  }

  private async requireIssue({
    issueId,
    organizationId,
  }: {
    issueId: string;
    organizationId: string;
  }) {
    const issue = await db.ismsContextIssue.findFirst({
      where: { id: issueId, document: { organizationId } },
    });
    if (!issue) {
      throw new NotFoundException('Context issue not found');
    }
    return issue;
  }
}
