import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { DynamicCheck, Prisma } from '@db';

@Injectable()
export class DynamicCheckRepository {
  async findByIntegrationId(integrationId: string): Promise<DynamicCheck[]> {
    return db.dynamicCheck.findMany({
      where: { integrationId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string): Promise<DynamicCheck | null> {
    return db.dynamicCheck.findUnique({ where: { id } });
  }

  async create(data: {
    integrationId: string;
    checkSlug: string;
    name: string;
    description: string;
    taskMapping?: string;
    defaultSeverity?: string;
    definition: Prisma.InputJsonValue;
    variables?: Prisma.InputJsonValue;
    isEnabled?: boolean;
    sortOrder?: number;
  }): Promise<DynamicCheck> {
    return db.dynamicCheck.create({
      data: {
        integrationId: data.integrationId,
        checkSlug: data.checkSlug,
        name: data.name,
        description: data.description,
        taskMapping: data.taskMapping,
        defaultSeverity: data.defaultSeverity ?? 'medium',
        definition: data.definition,
        variables: data.variables ?? [],
        isEnabled: data.isEnabled ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.DynamicCheckUpdateInput,
  ): Promise<DynamicCheck> {
    return db.dynamicCheck.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await db.dynamicCheck.delete({ where: { id } });
  }

  async deleteAllForIntegration(integrationId: string): Promise<void> {
    await db.dynamicCheck.deleteMany({ where: { integrationId } });
  }

  async upsert(data: {
    integrationId: string;
    checkSlug: string;
    name: string;
    description: string;
    taskMapping?: string;
    defaultSeverity?: string;
    definition: Prisma.InputJsonValue;
    variables?: Prisma.InputJsonValue;
    isEnabled?: boolean;
    sortOrder?: number;
    service?: string;
  }): Promise<DynamicCheck> {
    return db.dynamicCheck.upsert({
      where: {
        integrationId_checkSlug: {
          integrationId: data.integrationId,
          checkSlug: data.checkSlug,
        },
      },
      create: {
        integrationId: data.integrationId,
        checkSlug: data.checkSlug,
        name: data.name,
        description: data.description,
        taskMapping: data.taskMapping,
        defaultSeverity: data.defaultSeverity ?? 'medium',
        definition: data.definition,
        variables: data.variables ?? [],
        isEnabled: data.isEnabled ?? true,
        sortOrder: data.sortOrder ?? 0,
        service: data.service,
      },
      update: {
        name: data.name,
        description: data.description,
        taskMapping: data.taskMapping,
        defaultSeverity: data.defaultSeverity ?? 'medium',
        definition: data.definition,
        variables: data.variables ?? [],
        isEnabled: data.isEnabled ?? true,
        sortOrder: data.sortOrder ?? 0,
        service: data.service,
      },
    });
  }
}
