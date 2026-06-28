import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { IntegrationConnection, IntegrationConnectionStatus } from '@db';

export interface CreateConnectionDto {
  providerId: string;
  organizationId: string;
  authStrategy: string;
  metadata?: object;
}

export interface UpdateConnectionDto {
  status?: IntegrationConnectionStatus;
  activeCredentialVersionId?: string | null;
  lastSyncAt?: Date;
  nextSyncAt?: Date;
  syncCadence?: string | null;
  metadata?: object;
  variables?: object;
  errorMessage?: string | null;
}

@Injectable()
export class ConnectionRepository {
  async findById(id: string): Promise<IntegrationConnection | null> {
    return db.integrationConnection.findUnique({
      where: { id },
      include: {
        provider: true,
      },
    });
  }

  async findByProviderAndOrg(
    providerId: string,
    organizationId: string,
  ): Promise<IntegrationConnection | null> {
    return db.integrationConnection.findFirst({
      where: {
        providerId,
        organizationId,
        status: { not: 'disconnected' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        provider: true,
      },
    });
  }

  async findBySlugAndOrg(
    providerSlug: string,
    organizationId: string,
  ): Promise<IntegrationConnection | null> {
    const provider = await db.integrationProvider.findUnique({
      where: { slug: providerSlug },
    });

    if (!provider) return null;

    return this.findByProviderAndOrg(provider.id, organizationId);
  }

  async findByOrganization(
    organizationId: string,
  ): Promise<IntegrationConnection[]> {
    return db.integrationConnection.findMany({
      where: { organizationId },
      include: {
        provider: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveByOrganization(
    organizationId: string,
  ): Promise<IntegrationConnection[]> {
    return db.integrationConnection.findMany({
      where: {
        organizationId,
        status: 'active',
      },
      include: {
        provider: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * All active connections for a single provider in an org. Used to run a
   * check against every connected account (e.g. each AWS account a customer
   * has connected) rather than only the first one.
   */
  async findActiveByProviderAndOrg(
    providerId: string,
    organizationId: string,
  ): Promise<IntegrationConnection[]> {
    return db.integrationConnection.findMany({
      where: {
        providerId,
        organizationId,
        status: 'active',
      },
      include: {
        provider: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: CreateConnectionDto): Promise<IntegrationConnection> {
    return db.integrationConnection.create({
      data: {
        providerId: data.providerId,
        organizationId: data.organizationId,
        authStrategy: data.authStrategy,
        status: 'pending',
        metadata: data.metadata,
      },
      include: {
        provider: true,
      },
    });
  }

  async update(
    id: string,
    data: UpdateConnectionDto,
  ): Promise<IntegrationConnection> {
    return db.integrationConnection.update({
      where: { id },
      data,
      include: {
        provider: true,
      },
    });
  }

  async updateStatus(
    id: string,
    status: IntegrationConnectionStatus,
    errorMessage?: string,
  ): Promise<IntegrationConnection> {
    return db.integrationConnection.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage ?? null,
      },
      include: {
        provider: true,
      },
    });
  }

  /**
   * Atomically try to acquire a short-lived lease that serializes token
   * refreshes for a connection across processes. Returns true only if this
   * caller now holds the lease. The conditional UPDATE means exactly one
   * concurrent caller wins; the lease auto-expires after `ttlSeconds` so a
   * crashed holder cannot block refreshes permanently. `leaseToken` records the
   * owner so the lease can only be released by the holder.
   */
  async acquireRefreshLease(
    id: string,
    ttlSeconds: number,
    leaseToken: string,
  ): Promise<boolean> {
    const affected = await db.$executeRaw`
      UPDATE "IntegrationConnection"
      SET "refreshLeaseUntil" = now() + make_interval(secs => ${ttlSeconds}),
          "refreshLeaseToken" = ${leaseToken}
      WHERE id = ${id}
        AND ("refreshLeaseUntil" IS NULL OR "refreshLeaseUntil" < now())
    `;
    return affected === 1;
  }

  /**
   * Release a refresh lease so waiting callers can proceed immediately rather
   * than waiting for it to expire. Only clears the lease if `leaseToken` still
   * matches the current owner — a holder whose work outlived the TTL must not
   * wipe a lease another worker has since acquired.
   */
  async releaseRefreshLease(id: string, leaseToken: string): Promise<void> {
    await db.$executeRaw`
      UPDATE "IntegrationConnection"
      SET "refreshLeaseUntil" = NULL,
          "refreshLeaseToken" = NULL
      WHERE id = ${id}
        AND "refreshLeaseToken" = ${leaseToken}
    `;
  }

  async delete(id: string): Promise<void> {
    await db.integrationConnection.delete({
      where: { id },
    });
  }

  async deleteByProviderAndOrg(
    providerId: string,
    organizationId: string,
  ): Promise<void> {
    await db.integrationConnection.deleteMany({
      where: { providerId, organizationId },
    });
  }
}
