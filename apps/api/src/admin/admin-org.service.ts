import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';

interface OrgQueryParams {
  orgId: string;
  status?: string;
  limit: number;
  offset: number;
}

@Injectable()
export class AdminOrgService {
  private async verifyOrg(orgId: string) {
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, onboardingCompleted: true },
    });
    if (!org) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }
    return org;
  }

  async getOrgHealth(orgId: string) {
    const org = await this.verifyOrg(orgId);

    const now = new Date();

    const [
      membersTotal,
      membersActive,
      membersDeactivated,
      tasksTotal,
      tasksOverdue,
      tasksByStatus,
      policiesTotal,
      policiesDraft,
      policiesPublished,
      policiesOverdueReview,
      risksTotal,
      risksOpen,
      risksClosed,
      findingsTotal,
      findingsOpen,
      findingsClosed,
      integrationsTotal,
      integrationsStale,
      vendorsTotal,
      vendorsNotAssessed,
      frameworksTotal,
      controlsTotal,
    ] = await Promise.all([
      db.member.count({ where: { organizationId: orgId } }),
      db.member.count({ where: { organizationId: orgId, deactivated: false } }),
      db.member.count({ where: { organizationId: orgId, deactivated: true } }),
      db.task.count({ where: { organizationId: orgId } }),
      db.task.count({
        where: {
          organizationId: orgId,
          status: { in: ['todo', 'in_progress'] },
          reviewDate: { lt: now },
        },
      }),
      this.getTaskStatusCounts(orgId),
      db.policy.count({ where: { organizationId: orgId } }),
      db.policy.count({ where: { organizationId: orgId, status: 'draft' } }),
      db.policy.count({ where: { organizationId: orgId, status: 'published' } }),
      db.policy.count({
        where: {
          organizationId: orgId,
          status: 'published',
          reviewDate: { lt: now },
        },
      }),
      db.risk.count({ where: { organizationId: orgId } }),
      db.risk.count({ where: { organizationId: orgId, status: 'open' } }),
      db.risk.count({ where: { organizationId: orgId, status: 'closed' } }),
      db.finding.count({ where: { organizationId: orgId } }),
      db.finding.count({ where: { organizationId: orgId, status: 'open' } }),
      db.finding.count({ where: { organizationId: orgId, status: 'closed' } }),
      db.integration.count({ where: { organizationId: orgId } }),
      db.integration.count({
        where: {
          organizationId: orgId,
          OR: [
            { lastRunAt: null },
            { lastRunAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } },
          ],
        },
      }),
      db.vendor.count({ where: { organizationId: orgId } }),
      db.vendor.count({ where: { organizationId: orgId, status: 'not_assessed' } }),
      db.frameworkInstance.count({ where: { organizationId: orgId } }),
      db.control.count({ where: { organizationId: orgId } }),
    ]);

    return {
      org,
      members: { total: membersTotal, active: membersActive, deactivated: membersDeactivated },
      tasks: { total: tasksTotal, overdue: tasksOverdue, byStatus: tasksByStatus },
      policies: { total: policiesTotal, overdueReview: policiesOverdueReview, draft: policiesDraft, published: policiesPublished },
      risks: { total: risksTotal, open: risksOpen, closed: risksClosed },
      findings: { total: findingsTotal, open: findingsOpen, closed: findingsClosed },
      integrations: { total: integrationsTotal, stale: integrationsStale },
      vendors: { total: vendorsTotal, notAssessed: vendorsNotAssessed },
      frameworks: { total: frameworksTotal },
      controls: { total: controlsTotal },
    };
  }

  private async getTaskStatusCounts(orgId: string) {
    const statuses = ['todo', 'in_progress', 'in_review', 'done', 'not_relevant', 'failed'] as const;
    const counts = await Promise.all(
      statuses.map((status) => db.task.count({ where: { organizationId: orgId, status } })),
    );
    return Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  }

  async getOrgMembers({ orgId, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const [data, count] = await Promise.all([
      db.member.findMany({
        where: { organizationId: orgId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          role: true,
          department: true,
          jobTitle: true,
          isActive: true,
          deactivated: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true, lastLogin: true } },
        },
      }),
      db.member.count({ where: { organizationId: orgId } }),
    ]);

    return { data, count };
  }

  async getOrgPolicies({ orgId, status, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const where: Record<string, unknown> = { organizationId: orgId };
    if (status) where.status = status;

    const [data, count] = await Promise.all([
      db.policy.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          frequency: true,
          reviewDate: true,
          lastPublishedAt: true,
          createdAt: true,
          assignee: { select: { id: true, user: { select: { name: true, email: true } } } },
        },
      }),
      db.policy.count({ where }),
    ]);

    return { data, count };
  }

  async getOrgTasks({ orgId, status, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const where: Record<string, unknown> = { organizationId: orgId };
    if (status) where.status = status;

    const [data, count] = await Promise.all([
      db.task.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          automationStatus: true,
          frequency: true,
          reviewDate: true,
          lastCompletedAt: true,
          createdAt: true,
          assignee: { select: { id: true, user: { select: { name: true, email: true } } } },
        },
      }),
      db.task.count({ where }),
    ]);

    return { data, count };
  }

  async getOrgControls({ orgId, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const [data, count] = await Promise.all([
      db.control.findMany({
        where: { organizationId: orgId },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          description: true,
          lastReviewDate: true,
          nextReviewDate: true,
        },
      }),
      db.control.count({ where: { organizationId: orgId } }),
    ]);

    return { data, count };
  }

  async getOrgRisks({ orgId, status, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const where: Record<string, unknown> = { organizationId: orgId };
    if (status) where.status = status;

    const [data, count] = await Promise.all([
      db.risk.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          likelihood: true,
          impact: true,
          treatmentStrategy: true,
          createdAt: true,
          assignee: { select: { id: true, user: { select: { name: true, email: true } } } },
        },
      }),
      db.risk.count({ where }),
    ]);

    return { data, count };
  }

}
