import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { IntegrationOAuthApp, Prisma } from '@prisma/client';

export interface CreateOAuthAppDto {
  providerSlug: string;
  organizationId: string;
  encryptedClientId: object;
  encryptedClientSecret: object;
  customScopes?: string[];
  customSettings?: Prisma.InputJsonValue;
}

export interface UpdateOAuthAppDto {
  encryptedClientId?: object;
  encryptedClientSecret?: object;
  customScopes?: string[];
  customSettings?: Prisma.InputJsonValue;
  isActive?: boolean;
}

@Injectable()
export class OAuthAppRepository {
  async findByProviderAndOrg(
    providerSlug: string,
    organizationId: string,
  ): Promise<IntegrationOAuthApp | null> {
    return db.integrationOAuthApp.findUnique({
      where: {
        providerSlug_organizationId: {
          providerSlug,
          organizationId,
        },
      },
    });
  }

  async findActiveByProviderAndOrg(
    providerSlug: string,
    organizationId: string,
  ): Promise<IntegrationOAuthApp | null> {
    return db.integrationOAuthApp.findFirst({
      where: {
        providerSlug,
        organizationId,
        isActive: true,
      },
    });
  }

  async findByOrganization(
    organizationId: string,
  ): Promise<IntegrationOAuthApp[]> {
    return db.integrationOAuthApp.findMany({
      where: { organizationId },
      orderBy: { providerSlug: 'asc' },
    });
  }

  async create(data: CreateOAuthAppDto): Promise<IntegrationOAuthApp> {
    return db.integrationOAuthApp.create({
      data: {
        providerSlug: data.providerSlug,
        organizationId: data.organizationId,
        encryptedClientId: data.encryptedClientId,
        encryptedClientSecret: data.encryptedClientSecret,
        customScopes: data.customScopes || [],
        isActive: true,
      },
    });
  }

  async update(
    providerSlug: string,
    organizationId: string,
    data: UpdateOAuthAppDto,
  ): Promise<IntegrationOAuthApp> {
    return db.integrationOAuthApp.update({
      where: {
        providerSlug_organizationId: {
          providerSlug,
          organizationId,
        },
      },
      data: {
        encryptedClientId: data.encryptedClientId,
        encryptedClientSecret: data.encryptedClientSecret,
        customScopes: data.customScopes,
        customSettings: data.customSettings,
        isActive: data.isActive,
      },
    });
  }

  async upsert(data: CreateOAuthAppDto): Promise<IntegrationOAuthApp> {
    return db.integrationOAuthApp.upsert({
      where: {
        providerSlug_organizationId: {
          providerSlug: data.providerSlug,
          organizationId: data.organizationId,
        },
      },
      create: {
        providerSlug: data.providerSlug,
        organizationId: data.organizationId,
        encryptedClientId: data.encryptedClientId,
        encryptedClientSecret: data.encryptedClientSecret,
        customScopes: data.customScopes || [],
        customSettings: data.customSettings || undefined,
        isActive: true,
      },
      update: {
        encryptedClientId: data.encryptedClientId,
        encryptedClientSecret: data.encryptedClientSecret,
        customScopes: data.customScopes || [],
        customSettings: data.customSettings || undefined,
        isActive: true,
      },
    });
  }

  async delete(providerSlug: string, organizationId: string): Promise<void> {
    await db.integrationOAuthApp.delete({
      where: {
        providerSlug_organizationId: {
          providerSlug,
          organizationId,
        },
      },
    });
  }

  async setActive(
    providerSlug: string,
    organizationId: string,
    isActive: boolean,
  ): Promise<IntegrationOAuthApp> {
    return db.integrationOAuthApp.update({
      where: {
        providerSlug_organizationId: {
          providerSlug,
          organizationId,
        },
      },
      data: { isActive },
    });
  }
}
