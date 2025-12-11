import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConnectionRepository } from '../repositories/connection.repository';
import { ProviderRepository } from '../repositories/provider.repository';
import type {
  IntegrationConnection,
  IntegrationConnectionStatus,
} from '@prisma/client';

export interface CreateConnectionInput {
  providerSlug: string;
  organizationId: string;
  authStrategy: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ConnectionService {
  constructor(
    private readonly connectionRepository: ConnectionRepository,
    private readonly providerRepository: ProviderRepository,
  ) {}

  async getConnection(connectionId: string): Promise<IntegrationConnection> {
    const connection = await this.connectionRepository.findById(connectionId);
    if (!connection) {
      throw new NotFoundException(`Connection ${connectionId} not found`);
    }
    return connection;
  }

  async getConnectionByProviderSlug(
    providerSlug: string,
    organizationId: string,
  ): Promise<IntegrationConnection | null> {
    return this.connectionRepository.findBySlugAndOrg(
      providerSlug,
      organizationId,
    );
  }

  async getOrganizationConnections(
    organizationId: string,
  ): Promise<IntegrationConnection[]> {
    return this.connectionRepository.findByOrganization(organizationId);
  }

  async getActiveConnections(
    organizationId: string,
  ): Promise<IntegrationConnection[]> {
    return this.connectionRepository.findActiveByOrganization(organizationId);
  }

  async createConnection(
    input: CreateConnectionInput,
  ): Promise<IntegrationConnection> {
    // Verify provider exists
    const provider = await this.providerRepository.findBySlug(
      input.providerSlug,
    );
    if (!provider) {
      throw new NotFoundException(`Provider ${input.providerSlug} not found`);
    }

    // Check if connection already exists
    const existing = await this.connectionRepository.findByProviderAndOrg(
      provider.id,
      input.organizationId,
    );
    if (existing) {
      throw new ConflictException(
        `Connection to ${input.providerSlug} already exists for this organization`,
      );
    }

    return this.connectionRepository.create({
      providerId: provider.id,
      organizationId: input.organizationId,
      authStrategy: input.authStrategy,
      metadata: input.metadata,
    });
  }

  async updateConnectionStatus(
    connectionId: string,
    status: IntegrationConnectionStatus,
    errorMessage?: string,
  ): Promise<IntegrationConnection> {
    await this.getConnection(connectionId); // Verify exists
    return this.connectionRepository.updateStatus(
      connectionId,
      status,
      errorMessage,
    );
  }

  async activateConnection(
    connectionId: string,
  ): Promise<IntegrationConnection> {
    return this.updateConnectionStatus(connectionId, 'active');
  }

  async pauseConnection(connectionId: string): Promise<IntegrationConnection> {
    return this.updateConnectionStatus(connectionId, 'paused');
  }

  async setConnectionError(
    connectionId: string,
    errorMessage: string,
  ): Promise<IntegrationConnection> {
    return this.updateConnectionStatus(connectionId, 'error', errorMessage);
  }

  async disconnectConnection(
    connectionId: string,
  ): Promise<IntegrationConnection> {
    return this.updateConnectionStatus(connectionId, 'disconnected');
  }

  async deleteConnection(connectionId: string): Promise<void> {
    await this.getConnection(connectionId); // Verify exists
    await this.connectionRepository.delete(connectionId);
  }

  async updateLastSync(connectionId: string): Promise<IntegrationConnection> {
    return this.connectionRepository.update(connectionId, {
      lastSyncAt: new Date(),
    });
  }

  async updateNextSync(
    connectionId: string,
    nextSyncAt: Date,
  ): Promise<IntegrationConnection> {
    return this.connectionRepository.update(connectionId, {
      nextSyncAt,
    });
  }

  async updateSyncCadence(
    connectionId: string,
    syncCadence: string | null,
  ): Promise<IntegrationConnection> {
    return this.connectionRepository.update(connectionId, {
      syncCadence,
    });
  }
}
