import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { Prisma } from '@prisma/client';

export interface CreatePlatformCredentialDto {
  providerSlug: string;
  encryptedClientId: Prisma.InputJsonValue;
  encryptedClientSecret: Prisma.InputJsonValue;
  customScopes?: string[];
  customSettings?: Prisma.InputJsonValue;
  createdById?: string;
}

export interface UpdatePlatformCredentialDto {
  encryptedClientId?: Prisma.InputJsonValue;
  encryptedClientSecret?: Prisma.InputJsonValue;
  customScopes?: string[];
  customSettings?: Prisma.InputJsonValue;
  isActive?: boolean;
  updatedById?: string;
}

@Injectable()
export class PlatformCredentialRepository {
  async findByProviderSlug(providerSlug: string) {
    return db.integrationPlatformCredential.findUnique({
      where: { providerSlug },
    });
  }

  async findActiveByProviderSlug(providerSlug: string) {
    return db.integrationPlatformCredential.findFirst({
      where: {
        providerSlug,
        isActive: true,
      },
    });
  }

  async findAll() {
    return db.integrationPlatformCredential.findMany({
      orderBy: { providerSlug: 'asc' },
    });
  }

  async create(data: CreatePlatformCredentialDto) {
    return db.integrationPlatformCredential.create({
      data: {
        providerSlug: data.providerSlug,
        encryptedClientId: data.encryptedClientId,
        encryptedClientSecret: data.encryptedClientSecret,
        customScopes: data.customScopes || [],
        createdById: data.createdById,
        updatedById: data.createdById,
      },
    });
  }

  async update(providerSlug: string, data: UpdatePlatformCredentialDto) {
    return db.integrationPlatformCredential.update({
      where: { providerSlug },
      data: {
        ...(data.encryptedClientId && {
          encryptedClientId: data.encryptedClientId,
        }),
        ...(data.encryptedClientSecret && {
          encryptedClientSecret: data.encryptedClientSecret,
        }),
        ...(data.customScopes !== undefined && {
          customScopes: data.customScopes,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.updatedById && { updatedById: data.updatedById }),
      },
    });
  }

  async upsert(data: CreatePlatformCredentialDto) {
    return db.integrationPlatformCredential.upsert({
      where: { providerSlug: data.providerSlug },
      create: {
        providerSlug: data.providerSlug,
        encryptedClientId: data.encryptedClientId,
        encryptedClientSecret: data.encryptedClientSecret,
        customScopes: data.customScopes || [],
        customSettings: data.customSettings,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
      update: {
        encryptedClientId: data.encryptedClientId,
        encryptedClientSecret: data.encryptedClientSecret,
        customScopes: data.customScopes || [],
        customSettings: data.customSettings,
        updatedById: data.createdById,
      },
    });
  }

  async delete(providerSlug: string) {
    return db.integrationPlatformCredential.delete({
      where: { providerSlug },
    });
  }
}
