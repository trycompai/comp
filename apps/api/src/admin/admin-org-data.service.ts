import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@trycompai/db';

interface OrgQueryParams {
  orgId: string;
  status?: string;
  limit: number;
  offset: number;
}

@Injectable()
export class AdminOrgDataService {
  private async verifyOrg(orgId: string) {
    const exists = await db.organization.count({ where: { id: orgId } });
    if (!exists) {
      throw new NotFoundException(`Organization ${orgId} not found`);
    }
  }

  async getOrgVendors({ orgId, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const [data, count] = await Promise.all([
      db.vendor.findMany({
        where: { organizationId: orgId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
          website: true,
          createdAt: true,
          assignee: { select: { id: true, user: { select: { name: true, email: true } } } },
        },
      }),
      db.vendor.count({ where: { organizationId: orgId } }),
    ]);

    return { data, count };
  }

  async getOrgFrameworks({ orgId, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const [data, count] = await Promise.all([
      db.frameworkInstance.findMany({
        where: { organizationId: orgId },
        take: limit,
        skip: offset,
        select: {
          id: true,
          frameworkId: true,
          framework: { select: { name: true, version: true } },
        },
      }),
      db.frameworkInstance.count({ where: { organizationId: orgId } }),
    ]);

    return { data, count };
  }

  async getOrgFindings({ orgId, status, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const where: Record<string, unknown> = { organizationId: orgId };
    if (status) where.status = status;

    const [data, count] = await Promise.all([
      db.finding.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          content: true,
          taskId: true,
          createdAt: true,
        },
      }),
      db.finding.count({ where }),
    ]);

    return { data, count };
  }

  async getOrgIntegrations({ orgId, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const [data, count] = await Promise.all([
      db.integration.findMany({
        where: { organizationId: orgId },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          integrationId: true,
          lastRunAt: true,
        },
      }),
      db.integration.count({ where: { organizationId: orgId } }),
    ]);

    return { data, count };
  }

  async getOrgComments({ orgId, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const [data, count] = await Promise.all([
      db.comment.findMany({
        where: { organizationId: orgId },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          entityId: true,
          entityType: true,
          createdAt: true,
          author: { select: { id: true, user: { select: { name: true, email: true } } } },
        },
      }),
      db.comment.count({ where: { organizationId: orgId } }),
    ]);

    return { data, count };
  }

  async getOrgAuditLogs({ orgId, limit, offset }: OrgQueryParams) {
    await this.verifyOrg(orgId);

    const [data, count] = await Promise.all([
      db.auditLog.findMany({
        where: { organizationId: orgId },
        take: limit,
        skip: offset,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          timestamp: true,
          userId: true,
          memberId: true,
          description: true,
          entityId: true,
          entityType: true,
          data: true,
        },
      }),
      db.auditLog.count({ where: { organizationId: orgId } }),
    ]);

    return { data, count };
  }
}
