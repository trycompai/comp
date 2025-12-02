import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { IntegrationProvider } from '@prisma/client';

export interface CreateProviderDto {
  slug: string;
  name: string;
  category: string;
  manifestHash?: string;
  capabilities: string[];
  isActive: boolean;
}

@Injectable()
export class ProviderRepository {
  async findBySlug(slug: string): Promise<IntegrationProvider | null> {
    return db.integrationProvider.findUnique({
      where: { slug },
    });
  }

  async findById(id: string): Promise<IntegrationProvider | null> {
    return db.integrationProvider.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<IntegrationProvider[]> {
    return db.integrationProvider.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findActive(): Promise<IntegrationProvider[]> {
    return db.integrationProvider.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findByCategory(category: string): Promise<IntegrationProvider[]> {
    return db.integrationProvider.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  async upsert(data: CreateProviderDto): Promise<IntegrationProvider> {
    return db.integrationProvider.upsert({
      where: { slug: data.slug },
      create: {
        slug: data.slug,
        name: data.name,
        category: data.category,
        manifestHash: data.manifestHash,
        capabilities: data.capabilities,
        isActive: data.isActive,
      },
      update: {
        name: data.name,
        category: data.category,
        manifestHash: data.manifestHash,
        capabilities: data.capabilities,
        isActive: data.isActive,
      },
    });
  }

  async updateManifestHash(
    slug: string,
    manifestHash: string,
  ): Promise<IntegrationProvider> {
    return db.integrationProvider.update({
      where: { slug },
      data: { manifestHash },
    });
  }

  async setActive(
    slug: string,
    isActive: boolean,
  ): Promise<IntegrationProvider> {
    return db.integrationProvider.update({
      where: { slug },
      data: { isActive },
    });
  }
}
