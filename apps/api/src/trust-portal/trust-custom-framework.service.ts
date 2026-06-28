import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@db';
import type {
  TrustCustomFrameworkAdminItem,
  TrustCustomFrameworkPublicItem,
  UpdateTrustCustomFrameworkDto,
} from './dto/trust-custom-framework.dto';
import { TrustCustomFrameworkBadgeService } from './trust-custom-framework-badge.service';

/**
 * Manages which org-authored custom frameworks are displayed on the public
 * Trust Portal. Native frameworks store their enabled/status as columns on
 * `Trust`; custom frameworks are dynamic per-org rows, so their portal selection
 * lives in the `TrustCustomFramework` join table.
 *
 * Certificate upload/download for custom frameworks reuses the shared PDF/S3
 * code paths in TrustPortalService / TrustAccessService (keyed by
 * `customFrameworkId` instead of the TrustFramework enum).
 */
@Injectable()
export class TrustCustomFrameworkService {
  private readonly logger = new Logger(TrustCustomFrameworkService.name);

  constructor(
    private readonly badgeService: TrustCustomFrameworkBadgeService,
  ) {}

  /**
   * List every custom framework the org owns, joined with its Trust Portal
   * selection state and whether a certificate has been uploaded. Frameworks the
   * org never configured for the portal come back as disabled / 'started'.
   */
  async listForOrg(
    organizationId: string,
  ): Promise<TrustCustomFrameworkAdminItem[]> {
    const [customFrameworks, selections, certificates] = await Promise.all([
      db.customFramework.findMany({
        where: { organizationId },
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      }),
      db.trustCustomFramework.findMany({
        where: { organizationId },
        select: {
          customFrameworkId: true,
          enabled: true,
          status: true,
          badgeS3Key: true,
        },
      }),
      db.trustResource.findMany({
        where: { organizationId, customFrameworkId: { not: null } },
        select: { customFrameworkId: true, fileName: true },
      }),
    ]);

    const selectionByFramework = new Map(
      selections.map((s) => [s.customFrameworkId, s]),
    );
    const certificateByFramework = new Map(
      certificates
        .filter((c) => c.customFrameworkId)
        .map((c) => [c.customFrameworkId as string, c.fileName]),
    );

    return Promise.all(
      customFrameworks.map(async (framework) => {
        const selection = selectionByFramework.get(framework.id);
        const certificateFileName =
          certificateByFramework.get(framework.id) ?? null;
        return {
          customFrameworkId: framework.id,
          name: framework.name,
          description: framework.description,
          enabled: selection?.enabled ?? false,
          status: selection?.status ?? 'started',
          hasCertificate: certificateFileName !== null,
          certificateFileName,
          badgeUrl: selection?.badgeS3Key
            ? await this.badgeService.signBadgeUrl(selection.badgeS3Key)
            : null,
        };
      }),
    );
  }

  /**
   * Upsert the portal selection (enabled / status) for one custom framework.
   * Only the provided fields are changed; on first write the schema defaults
   * (enabled=true, status='started') fill the rest.
   */
  async updateSelection(
    organizationId: string,
    dto: UpdateTrustCustomFrameworkDto,
  ): Promise<{ success: true }> {
    const { customFrameworkId, enabled, status } = dto;

    // Tenant check: the custom framework must belong to this org. Also satisfies
    // the composite FK (customFrameworkId, organizationId) -> CustomFramework.
    const customFramework = await db.customFramework.findFirst({
      where: { id: customFrameworkId, organizationId },
      select: { id: true },
    });

    if (!customFramework) {
      throw new NotFoundException('Custom framework not found');
    }

    const changes = {
      ...(enabled !== undefined ? { enabled } : {}),
      ...(status !== undefined ? { status } : {}),
    };

    await db.trustCustomFramework.upsert({
      where: {
        organizationId_customFrameworkId: { organizationId, customFrameworkId },
      },
      create: { organizationId, customFrameworkId, ...changes },
      update: changes,
    });

    this.logger.log(
      `Updated trust portal selection for custom framework ${customFrameworkId} (org ${organizationId})`,
    );

    return { success: true };
  }

  /**
   * Custom frameworks shown on the public portal for a given friendly URL.
   * Only enabled selections are returned. Resolves the org by friendlyUrl,
   * falling back to treating the route id as the organizationId (matches the
   * other public trust-access endpoints).
   */
  async getPublicCustomFrameworks(
    friendlyUrl: string,
  ): Promise<TrustCustomFrameworkPublicItem[]> {
    const organizationId = await this.resolveOrganizationId(friendlyUrl);
    if (!organizationId) {
      return [];
    }

    const selections = await db.trustCustomFramework.findMany({
      where: { organizationId, enabled: true },
      select: {
        status: true,
        badgeS3Key: true,
        customFramework: {
          select: { id: true, name: true, description: true },
        },
      },
      orderBy: { customFramework: { name: 'asc' } },
    });

    if (selections.length === 0) {
      return [];
    }

    const certificates = await db.trustResource.findMany({
      where: { organizationId, customFrameworkId: { not: null } },
      select: { customFrameworkId: true },
    });
    const withCertificate = new Set(
      certificates.map((c) => c.customFrameworkId),
    );

    return Promise.all(
      selections.map(async (selection) => ({
        id: selection.customFramework.id,
        name: selection.customFramework.name,
        description: selection.customFramework.description,
        status: selection.status,
        hasCertificate: withCertificate.has(selection.customFramework.id),
        badgeUrl: selection.badgeS3Key
          ? await this.badgeService.signBadgeUrl(selection.badgeS3Key)
          : null,
      })),
    );
  }

  private async resolveOrganizationId(
    friendlyUrl: string,
  ): Promise<string | null> {
    const byFriendlyUrl = await db.trust.findUnique({
      where: { friendlyUrl },
      select: { organizationId: true },
    });
    if (byFriendlyUrl) {
      return byFriendlyUrl.organizationId;
    }

    const byOrgId = await db.trust.findUnique({
      where: { organizationId: friendlyUrl },
      select: { organizationId: true },
    });
    return byOrgId?.organizationId ?? null;
  }
}
