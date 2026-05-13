import { Injectable } from '@nestjs/common';
import { db } from '@db';

/**
 * Aggregates Phase 5 audit-trail data (resolutions, active exceptions,
 * regressions) for a single connection into one payload for the History tab.
 */
@Injectable()
export class CloudHistoryService {
  async getHistory(params: {
    organizationId: string;
    connectionId: string;
  }) {
    const [resolutions, exceptions, regressions] = await Promise.all([
      db.findingResolution.findMany({
        where: {
          organizationId: params.organizationId,
          connectionId: params.connectionId,
        },
        orderBy: { resolvedAt: 'desc' },
        take: 200,
      }),
      db.findingException.findMany({
        where: {
          organizationId: params.organizationId,
          connectionId: params.connectionId,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        orderBy: { markedAt: 'desc' },
        take: 100,
      }),
      db.findingRegression.findMany({
        where: {
          organizationId: params.organizationId,
          connectionId: params.connectionId,
        },
        orderBy: { regressedAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      summary: {
        resolutions: resolutions.length,
        platformFixes: resolutions.filter(
          (r) => r.resolutionMethod === 'platform_fix',
        ).length,
        externalFixes: resolutions.filter(
          (r) => r.resolutionMethod === 'external_fix',
        ).length,
        resourceDeleted: resolutions.filter(
          (r) => r.resolutionMethod === 'resource_deleted',
        ).length,
        exceptionMarked: resolutions.filter(
          (r) => r.resolutionMethod === 'exception_marked',
        ).length,
        activeExceptions: exceptions.length,
        regressions: regressions.length,
      },
      resolutions,
      exceptions,
      regressions,
    };
  }
}
