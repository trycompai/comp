import { Injectable } from '@nestjs/common';
import { db } from '@db';
import type { IntegrationRunStatus, Prisma } from '@prisma/client';

export interface CreateCheckRunDto {
  connectionId: string;
  taskId?: string;
  checkId: string;
  checkName: string;
}

export interface CompleteCheckRunDto {
  status: 'success' | 'failed';
  durationMs: number;
  totalChecked: number;
  passedCount: number;
  failedCount: number;
  errorMessage?: string;
  logs?: Prisma.InputJsonValue;
}

export interface CreateCheckResultDto {
  checkRunId: string;
  passed: boolean;
  resourceType: string;
  resourceId: string;
  title: string;
  description?: string;
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  remediation?: string;
  evidence?: Prisma.InputJsonValue;
}

@Injectable()
export class CheckRunRepository {
  /**
   * Create a new check run (status = running)
   */
  async create(data: CreateCheckRunDto) {
    return db.integrationCheckRun.create({
      data: {
        connectionId: data.connectionId,
        taskId: data.taskId,
        checkId: data.checkId,
        checkName: data.checkName,
        status: 'running',
        startedAt: new Date(),
      },
    });
  }

  /**
   * Complete a check run with results
   */
  async complete(id: string, data: CompleteCheckRunDto) {
    return db.integrationCheckRun.update({
      where: { id },
      data: {
        status: data.status,
        completedAt: new Date(),
        durationMs: data.durationMs,
        totalChecked: data.totalChecked,
        passedCount: data.passedCount,
        failedCount: data.failedCount,
        errorMessage: data.errorMessage,
        logs: data.logs,
      },
    });
  }

  /**
   * Add a result to a check run
   */
  async addResult(data: CreateCheckResultDto) {
    return db.integrationCheckResult.create({
      data: {
        checkRunId: data.checkRunId,
        passed: data.passed,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        title: data.title,
        description: data.description,
        severity: data.severity,
        remediation: data.remediation,
        evidence: data.evidence,
      },
    });
  }

  /**
   * Add multiple results in a batch
   */
  async addResults(results: CreateCheckResultDto[]) {
    return db.integrationCheckResult.createMany({
      data: results.map((r) => ({
        checkRunId: r.checkRunId,
        passed: r.passed,
        resourceType: r.resourceType,
        resourceId: r.resourceId,
        title: r.title,
        description: r.description,
        severity: r.severity,
        remediation: r.remediation,
        evidence: r.evidence,
      })),
    });
  }

  /**
   * Get a check run by ID with results
   */
  async findById(id: string) {
    return db.integrationCheckRun.findUnique({
      where: { id },
      include: {
        results: true,
        connection: {
          include: {
            provider: true,
          },
        },
      },
    });
  }

  /**
   * Get check runs for a task
   */
  async findByTask(taskId: string, limit = 10) {
    return db.integrationCheckRun.findMany({
      where: { taskId },
      include: {
        results: true,
        connection: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get the latest check run for a specific check on a task
   */
  async findLatestByTaskAndCheck(taskId: string, checkId: string) {
    return db.integrationCheckRun.findFirst({
      where: { taskId, checkId },
      include: {
        results: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get check runs for a connection
   */
  async findByConnection(connectionId: string, limit = 20) {
    return db.integrationCheckRun.findMany({
      where: { connectionId },
      include: {
        results: true,
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all check runs for an organization (via connections)
   */
  async findByOrganization(organizationId: string, limit = 50) {
    return db.integrationCheckRun.findMany({
      where: {
        connection: {
          organizationId,
        },
      },
      include: {
        results: true,
        connection: {
          include: {
            provider: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
