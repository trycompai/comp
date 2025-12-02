import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type {
  IntegrationConnection,
  IntegrationConnectionStatus,
} from '@prisma/client';

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
    return db.integrationConnection.findUnique({
      where: {
        providerId_organizationId: {
          providerId,
          organizationId,
        },
      },
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

  async delete(id: string): Promise<void> {
    await db.integrationConnection.delete({
      where: { id },
    });
  }

  async deleteByProviderAndOrg(
    providerId: string,
    organizationId: string,
  ): Promise<void> {
    await db.integrationConnection.delete({
      where: {
        providerId_organizationId: {
          providerId,
          organizationId,
        },
      },
    });
  }
}
