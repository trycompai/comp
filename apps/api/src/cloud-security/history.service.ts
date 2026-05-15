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
    // Cap rows returned to keep payload bounded; pull true totals from
    // separate count queries so the UI can show "showing 200 of 432"
    // instead of pretending the truncated set is the full picture.
    const resolutionsWhere = {
      organizationId: params.organizationId,
      connectionId: params.connectionId,
    };
    const exceptionsWhere = {
      organizationId: params.organizationId,
      connectionId: params.connectionId,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ] as Array<{ expiresAt: null } | { expiresAt: { gt: Date } }>,
    };
    const regressionsWhere = {
      organizationId: params.organizationId,
      connectionId: params.connectionId,
    };

    const [
      resolutions,
      resolutionsTotal,
      exceptions,
      exceptionsTotal,
      regressions,
      regressionsTotal,
      platformFixes,
      externalFixes,
      resourceDeleted,
      exceptionMarked,
    ] = await Promise.all([
      db.findingResolution.findMany({
        where: resolutionsWhere,
        orderBy: { resolvedAt: 'desc' },
        take: 200,
      }),
      db.findingResolution.count({ where: resolutionsWhere }),
      db.findingException.findMany({
        where: exceptionsWhere,
        orderBy: { markedAt: 'desc' },
        take: 100,
      }),
      db.findingException.count({ where: exceptionsWhere }),
      db.findingRegression.findMany({
        where: regressionsWhere,
        orderBy: { regressedAt: 'desc' },
        take: 100,
      }),
      db.findingRegression.count({ where: regressionsWhere }),
      db.findingResolution.count({
        where: { ...resolutionsWhere, resolutionMethod: 'platform_fix' },
      }),
      db.findingResolution.count({
        where: { ...resolutionsWhere, resolutionMethod: 'external_fix' },
      }),
      db.findingResolution.count({
        where: { ...resolutionsWhere, resolutionMethod: 'resource_deleted' },
      }),
      db.findingResolution.count({
        where: { ...resolutionsWhere, resolutionMethod: 'exception_marked' },
      }),
    ]);

    return {
      summary: {
        resolutions: resolutionsTotal,
        platformFixes,
        externalFixes,
        resourceDeleted,
        exceptionMarked,
        activeExceptions: exceptionsTotal,
        regressions: regressionsTotal,
      },
      resolutions,
      exceptions,
      regressions,
      // Lets the UI surface "Showing 200 of 432" when truncation is active.
      truncated: {
        resolutions: resolutionsTotal > resolutions.length,
        exceptions: exceptionsTotal > exceptions.length,
        regressions: regressionsTotal > regressions.length,
      },
    };
  }
}
