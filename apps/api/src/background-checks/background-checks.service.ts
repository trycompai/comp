import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BackgroundCheckStatus, db, Prisma } from '@db';
import { BackgroundCheckIdentityClient } from './background-check-identity.client';
import { BackgroundCheckPaymentService } from './background-check-payment.service';
import {
  headerValue,
  verifyBackgroundCheckWebhookSignature,
} from './background-check-webhook-signature';
import { identityWebhookPayloadSchema } from './background-checks.types';
import { fetchCompletedReportSnapshot } from './background-check-report-snapshot';
import {
  cancelForMember as cancelForMemberFn,
  deleteForMember as deleteForMemberFn,
  retryForMember as retryForMemberFn,
} from './background-check-retry';

@Injectable()
export class BackgroundChecksService {
  constructor(
    private readonly identityClient: BackgroundCheckIdentityClient,
    private readonly paymentService: BackgroundCheckPaymentService,
  ) {}

  async getForMember({
    organizationId,
    memberId,
  }: {
    organizationId: string;
    memberId: string;
  }) {
    return db.backgroundCheckRequest.findUnique({
      where: { organizationId_memberId: { organizationId, memberId } },
    });
  }

  async requestForMember({
    organizationId,
    memberId,
    employeeName,
    employeeEmail,
    requesterNotes,
    requesterEmail,
  }: {
    organizationId: string;
    memberId: string;
    employeeName: string;
    employeeEmail: string;
    requesterNotes?: string;
    requesterEmail: string;
  }) {
    const existing = await this.getForMember({ organizationId, memberId });
    if (existing) {
      return existing;
    }

    const member = await db.member.findFirst({
      where: { id: memberId, organizationId, deactivated: false },
      select: { id: true, organizationId: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found.');
    }

    // Step 1: Claim the record slot before charging. Catches the TOCTOU race
    // where two concurrent requests both pass the getForMember check.
    try {
      await db.backgroundCheckRequest.create({
        data: {
          organizationId,
          memberId,
          employeeName,
          employeeEmail,
          requesterNotes,
          status: BackgroundCheckStatus.invited,
          lastSyncedAt: new Date(),
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const raced = await this.getForMember({ organizationId, memberId });
        if (raced) return raced;
      }
      throw error;
    }

    // Step 2: Charge — record exists so a failure here is recoverable
    const payment = await this.paymentService.charge({
      organizationId,
      memberId,
    });

    // Step 3: Persist payment info. Refund if this write fails.
    try {
      await db.backgroundCheckRequest.update({
        where: { organizationId_memberId: { organizationId, memberId } },
        data: {
          stripePaymentIntentId: payment.paymentIntentId,
          stripePaymentStatus: payment.status,
          stripeAmountCents: payment.amount,
          stripeCurrency: payment.currency,
          lastSyncedAt: new Date(),
        },
      });
    } catch (error) {
      await this.paymentService.refund({
        organizationId,
        memberId,
        paymentIntentId: payment.paymentIntentId,
      });
      throw error;
    }

    // Step 4: Call Identity API — refund on failure
    let identityResult;
    try {
      identityResult = await this.identityClient.createBackgroundCheck({
        organizationId,
        memberId,
        employeeName,
        employeeEmail,
        requesterEmail,
        attempt: 0,
      });
    } catch (error) {
      const refundId = await this.paymentService.refund({
        organizationId,
        memberId,
        paymentIntentId: payment.paymentIntentId,
      });

      await db.backgroundCheckRequest.update({
        where: { organizationId_memberId: { organizationId, memberId } },
        data: {
          status: BackgroundCheckStatus.failed,
          stripeRefundId: refundId,
          lastSyncedAt: new Date(),
        },
      });

      throw error;
    }

    // Step 5: Persist Identity result
    return db.backgroundCheckRequest.update({
      where: { organizationId_memberId: { organizationId, memberId } },
      data: {
        identityBackgroundCheckId: identityResult.id,
        candidateUrl: identityResult.candidateUrl ?? null,
        status: identityResult.status,
        lastSyncedAt: new Date(),
      },
    });
  }

  async getById({
    organizationId,
    id,
  }: {
    organizationId: string;
    id: string;
  }): Promise<{ record: unknown; identity?: unknown }> {
    const record = await db.backgroundCheckRequest.findFirst({
      where: {
        organizationId,
        OR: [{ id }, { identityBackgroundCheckId: id }],
      },
    });

    if (!record) {
      throw new NotFoundException('Background check not found.');
    }

    if (
      !record.identityBackgroundCheckId ||
      !process.env.BACKGROUND_CHECK_API_KEY
    ) {
      return { record };
    }

    const identity = await this.identityClient.getBackgroundCheck(
      record.identityBackgroundCheckId,
    );
    return { record, identity };
  }

  async handleWebhook({
    rawBody,
    headers,
  }: {
    rawBody: Buffer | undefined;
    headers: Record<string, string | string[] | undefined>;
  }): Promise<{ ok: true; duplicate?: true }> {
    if (!rawBody) {
      throw new BadRequestException('Raw body unavailable.');
    }

    verifyBackgroundCheckWebhookSignature({ rawBody, headers });
    const payload = identityWebhookPayloadSchema.parse(
      JSON.parse(rawBody.toString('utf8')),
    );
    const eventId =
      headerValue(headers, 'x-background-check-event-id') ?? payload.eventId;
    const eventType =
      headerValue(headers, 'x-background-check-event-type') ?? payload.type;

    const record = await db.backgroundCheckRequest.findFirst({
      where: {
        organizationId: payload.data.metadata.compOrganizationId,
        memberId: payload.data.metadata.compMemberId,
        OR: [
          { identityBackgroundCheckId: payload.data.id },
          { identityBackgroundCheckId: null },
        ],
      },
    });

    if (!record) {
      throw new NotFoundException('Background check request not found.');
    }

    let isDuplicate = false;
    try {
      await db.backgroundCheckWebhookEvent.create({
        data: {
          eventId,
          eventType,
          backgroundCheckRequestId: record.id,
          identityBackgroundCheckId: payload.data.id,
          payload: payload as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        isDuplicate = true;
      } else {
        throw error;
      }
    }

    // Cancelled is terminal Comp-side: record the event for audit but never
    // let a late Identity webhook resurrect the status.
    if (record.status === BackgroundCheckStatus.cancelled) {
      return { ok: true, ...(isDuplicate ? { duplicate: true } : {}) };
    }

    const reportSnapshot = await fetchCompletedReportSnapshot({
      identityClient: this.identityClient,
      identityBackgroundCheckId: payload.data.id,
      eventType,
      status: payload.data.status,
    });

    await db.backgroundCheckRequest.update({
      where: { id: record.id },
      data: {
        identityBackgroundCheckId: payload.data.id,
        employeeName: payload.data.candidateName ?? record.employeeName,
        employeeEmail: payload.data.candidateEmail ?? record.employeeEmail,
        status: payload.data.status,
        identityStatus: payload.data.statuses?.identity ?? null,
        employmentStatus: payload.data.statuses?.employment ?? null,
        referenceStatus: payload.data.statuses?.references ?? null,
        rightToWorkStatus: payload.data.statuses?.rightToWork ?? null,
        adjudicationStatus: payload.data.statuses?.adjudication ?? null,
        lastWebhookEventId: eventId,
        lastSyncedAt: new Date(),
        ...(reportSnapshot
          ? {
              reportSnapshot,
              reportSyncedAt: new Date(),
            }
          : {}),
      },
    });

    return { ok: true, ...(isDuplicate ? { duplicate: true } : {}) };
  }

  async cancelForMember(params: { organizationId: string; memberId: string }) {
    return cancelForMemberFn({
      ...params,
      getForMember: (p) => this.getForMember(p),
    });
  }

  async retryForMember(params: {
    organizationId: string;
    memberId: string;
    requesterEmail: string;
  }) {
    return retryForMemberFn({
      ...params,
      identityClient: this.identityClient,
      getForMember: (p) => this.getForMember(p),
    });
  }

  async deleteForMember(params: { organizationId: string; memberId: string }) {
    return deleteForMemberFn({
      ...params,
      getForMember: (p) => this.getForMember(p),
    });
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
