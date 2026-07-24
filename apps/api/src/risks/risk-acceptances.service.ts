import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  db,
  type Impact,
  type Likelihood,
  type Prisma,
  type RiskAcceptance,
} from '@db';
import { CreateRiskAcceptanceDto } from './dto/create-risk-acceptance.dto';
import { LEVEL_LABEL, ratingLevel, type RiskLevel } from './risk-level';

// Residual-risk acceptance events (ISO 27001 Clause 6.1.3(f), CS-727).
//
// Acceptances are append-only: this service intentionally has no update or
// delete method. "Stale" is computed on read by comparing the residual rating
// frozen on the event against the parent's live residual rating — the moment
// the residual score changes, the acceptance needs re-recording; older events
// stay in the history as the audit trail.

export interface RiskAcceptanceView {
  id: string;
  acceptedById: string | null;
  acceptedByName: string;
  notes: string | null;
  residualLikelihood: Likelihood;
  residualImpact: Impact;
  level: RiskLevel;
  levelLabel: string;
  stale: boolean;
  createdAt: Date;
}

interface ResidualRating {
  residualLikelihood: Likelihood;
  residualImpact: Impact;
}

@Injectable()
export class RiskAcceptancesService {
  async listForRisk(riskId: string, organizationId: string) {
    const risk = await db.risk.findFirst({
      where: { id: riskId, organizationId },
      select: {
        id: true,
        assigneeId: true,
        residualLikelihood: true,
        residualImpact: true,
      },
    });
    if (!risk) {
      throw new NotFoundException(
        `Risk with ID ${riskId} not found in organization ${organizationId}`,
      );
    }

    const acceptances = await this.listBySubject(
      { riskId },
      organizationId,
      risk,
    );
    return { risk, acceptances };
  }

  async createForRisk(
    riskId: string,
    organizationId: string,
    dto: CreateRiskAcceptanceDto,
    /**
     * Caller-supplied access gate (e.g. hasRiskAccess for restricted roles),
     * run against the loaded risk BEFORE anything is written. Throwing here
     * aborts the create.
     */
    assertAccess?: (risk: { assigneeId: string | null }) => void,
  ): Promise<RiskAcceptanceView> {
    // Row-lock the risk for the whole read-freeze-insert sequence: a
    // concurrent residual PATCH blocks until this commits, so the frozen
    // rating is always the rating at acceptance time (never instantly stale).
    return db.$transaction(async (tx) => {
      // Org-scoped so a foreign-tenant id can never acquire (even briefly)
      // another organization's row lock.
      await tx.$queryRaw`SELECT id FROM "Risk" WHERE id = ${riskId} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const risk = await tx.risk.findFirst({
        where: { id: riskId, organizationId },
        select: {
          assigneeId: true,
          residualLikelihood: true,
          residualImpact: true,
        },
      });
      if (!risk) {
        throw new NotFoundException(
          `Risk with ID ${riskId} not found in organization ${organizationId}`,
        );
      }
      assertAccess?.(risk);

      return this.createAcceptance({
        tx,
        organizationId,
        subject: { riskId },
        dto,
        ownerMemberId: risk.assigneeId,
        current: risk,
      });
    });
  }

  async listForVendor(vendorId: string, organizationId: string) {
    const vendor = await this.findVendorRating(vendorId, organizationId);
    const acceptances = await this.listBySubject(
      { vendorId },
      organizationId,
      vendor.rating,
    );
    return { vendor, acceptances };
  }

  async createForVendor(
    vendorId: string,
    organizationId: string,
    dto: CreateRiskAcceptanceDto,
  ): Promise<RiskAcceptanceView> {
    // Same row-lock rationale as createForRisk.
    return db.$transaction(async (tx) => {
      // Org-scoped so a foreign-tenant id can never acquire (even briefly)
      // another organization's row lock.
      await tx.$queryRaw`SELECT id FROM "Vendor" WHERE id = ${vendorId} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const vendor = await this.findVendorRating(vendorId, organizationId, tx);

      return this.createAcceptance({
        tx,
        organizationId,
        subject: { vendorId },
        dto,
        ownerMemberId: vendor.assigneeId,
        current: vendor.rating,
      });
    });
  }

  private async findVendorRating(
    vendorId: string,
    organizationId: string,
    client?: Prisma.TransactionClient,
  ) {
    const vendor = await (client ?? db).vendor.findFirst({
      where: { id: vendorId, organizationId },
      select: {
        assigneeId: true,
        residualProbability: true,
        residualImpact: true,
      },
    });
    if (!vendor) {
      throw new NotFoundException(
        `Vendor with ID ${vendorId} not found in organization ${organizationId}`,
      );
    }
    // Vendor names its residual likelihood "residualProbability" — normalize
    // to the shared rating shape so risks and vendors share one code path.
    return {
      assigneeId: vendor.assigneeId,
      rating: {
        residualLikelihood: vendor.residualProbability,
        residualImpact: vendor.residualImpact,
      },
    };
  }

  private async listBySubject(
    subject: { riskId: string } | { vendorId: string },
    organizationId: string,
    current: ResidualRating,
  ): Promise<RiskAcceptanceView[]> {
    const rows = await db.riskAcceptance.findMany({
      // The subject is already resolved org-scoped; organizationId is
      // defense-in-depth so a malformed row could never cross tenants.
      where: { ...subject, organizationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => this.toView(row, current));
  }

  private async createAcceptance(params: {
    tx: Prisma.TransactionClient;
    organizationId: string;
    subject: { riskId: string } | { vendorId: string };
    dto: CreateRiskAcceptanceDto;
    ownerMemberId: string | null;
    current: ResidualRating;
  }): Promise<RiskAcceptanceView> {
    const { tx, organizationId, subject, dto, ownerMemberId, current } = params;

    const acceptorId = dto.acceptedById ?? ownerMemberId;
    if (!acceptorId) {
      throw new BadRequestException(
        'No owner is assigned. Assign an owner or choose an acceptor.',
      );
    }

    const member = await tx.member.findFirst({
      where: { id: acceptorId, organizationId },
      select: {
        deactivated: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (!member) {
      throw new BadRequestException(
        'Acceptor is not a member of this organization',
      );
    }
    if (member.deactivated) {
      throw new BadRequestException(
        'Acceptor is a deactivated member of this organization',
      );
    }

    const row = await tx.riskAcceptance.create({
      data: {
        organizationId,
        ...subject,
        acceptedById: acceptorId,
        // Frozen at acceptance so the historical record survives member
        // removal or renaming.
        acceptedByName: member.user.name?.trim() || member.user.email,
        notes: dto.notes?.trim() || null,
        residualLikelihood: current.residualLikelihood,
        residualImpact: current.residualImpact,
      },
    });

    return this.toView(row, current);
  }

  private toView(row: RiskAcceptance, current: ResidualRating) {
    const level = ratingLevel(row.residualLikelihood, row.residualImpact);
    return {
      id: row.id,
      acceptedById: row.acceptedById,
      acceptedByName: row.acceptedByName,
      notes: row.notes,
      residualLikelihood: row.residualLikelihood,
      residualImpact: row.residualImpact,
      level,
      levelLabel: LEVEL_LABEL[level],
      stale:
        row.residualLikelihood !== current.residualLikelihood ||
        row.residualImpact !== current.residualImpact,
      createdAt: row.createdAt,
    };
  }
}
