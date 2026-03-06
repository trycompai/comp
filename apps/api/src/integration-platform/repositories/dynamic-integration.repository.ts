import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { DynamicIntegration, DynamicCheck, Prisma } from '@prisma/client';

export type DynamicIntegrationWithChecks = DynamicIntegration & {
  checks: DynamicCheck[];
};

@Injectable()
export class DynamicIntegrationRepository {
  async findAll(): Promise<DynamicIntegrationWithChecks[]> {
    return db.dynamicIntegration.findMany({
      include: { checks: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async findActive(): Promise<DynamicIntegrationWithChecks[]> {
    return db.dynamicIntegration.findMany({
      where: { isActive: true },
      include: {
        checks: {
          where: { isEnabled: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<DynamicIntegrationWithChecks | null> {
    return db.dynamicIntegration.findUnique({
      where: { id },
      include: { checks: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async findBySlug(slug: string): Promise<DynamicIntegrationWithChecks | null> {
    return db.dynamicIntegration.findUnique({
      where: { slug },
      include: { checks: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async create(data: {
    slug: string;
    name: string;
    description: string;
    category: string;
    logoUrl: string;
    docsUrl?: string;
    baseUrl?: string;
    defaultHeaders?: Prisma.InputJsonValue;
    authConfig: Prisma.InputJsonValue;
    capabilities?: Prisma.InputJsonValue;
    supportsMultipleConnections?: boolean;
  }): Promise<DynamicIntegration> {
    return db.dynamicIntegration.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        category: data.category,
        logoUrl: data.logoUrl,
        docsUrl: data.docsUrl,
        baseUrl: data.baseUrl,
        defaultHeaders: data.defaultHeaders ?? undefined,
        authConfig: data.authConfig,
        capabilities: data.capabilities ?? ['checks'],
        supportsMultipleConnections: data.supportsMultipleConnections ?? false,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.DynamicIntegrationUpdateInput,
  ): Promise<DynamicIntegration> {
    return db.dynamicIntegration.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await db.dynamicIntegration.delete({ where: { id } });
  }

  async upsertBySlug(data: {
    slug: string;
    name: string;
    description: string;
    category: string;
    logoUrl: string;
    docsUrl?: string;
    baseUrl?: string;
    defaultHeaders?: Prisma.InputJsonValue;
    authConfig: Prisma.InputJsonValue;
    capabilities?: Prisma.InputJsonValue;
    supportsMultipleConnections?: boolean;
  }): Promise<DynamicIntegration> {
    return db.dynamicIntegration.upsert({
      where: { slug: data.slug },
      create: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        category: data.category,
        logoUrl: data.logoUrl,
        docsUrl: data.docsUrl,
        baseUrl: data.baseUrl,
        defaultHeaders: data.defaultHeaders ?? undefined,
        authConfig: data.authConfig,
        capabilities: data.capabilities ?? ['checks'],
        supportsMultipleConnections: data.supportsMultipleConnections ?? false,
      },
      update: {
        name: data.name,
        description: data.description,
        category: data.category,
        logoUrl: data.logoUrl,
        docsUrl: data.docsUrl,
        baseUrl: data.baseUrl,
        defaultHeaders: data.defaultHeaders ?? undefined,
        authConfig: data.authConfig,
        capabilities: data.capabilities ?? ['checks'],
        supportsMultipleConnections: data.supportsMultipleConnections ?? false,
      },
    });
  }
}
