import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CRITERIA, NOW } from './aws-task-completion-data';

export const ORG = 'synthetic-org';
export const TASK = 'synthetic-task';
export const AUTOMATION = 'synthetic-automation';
const MIGRATION = resolve(
  __dirname,
  '../../../../packages/db/prisma/migrations/20261115064000_bind_evaluation_criteria_snapshot/migration.sql',
);

function disposableUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('Use the disposable comp_security_tests database');
  const url = new URL(raw);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/comp_security_tests'
  ) {
    throw new Error('Refusing a non-disposable database');
  }
  const socket = url.searchParams.get('host');
  if (!socket) {
    if (process.env.CI !== 'true') {
      throw new Error('Local tests require an owned disposable Unix socket');
    }
    return raw;
  }
  if (!/^\/private\/tmp\/comp-task-gates-[a-f0-9]{32}\/socket$/.test(socket)) {
    throw new Error('Refusing an unowned database socket');
  }
  const owner = statSync(dirname(socket));
  const marker: unknown = JSON.parse(
    readFileSync(resolve(socket, '../owner.json'), 'utf8'),
  );
  if (
    owner.uid !== process.getuid?.() ||
    (owner.mode & 0o777) !== 0o700 ||
    typeof marker !== 'object' ||
    marker === null ||
    !('purpose' in marker) ||
    marker.purpose !== 'comp-task-completion-regressions'
  ) {
    throw new Error('Refusing an unverified database owner');
  }
  return raw;
}

export class CompletionDatabase {
  readonly schema = `task_completion_${randomUUID().replaceAll('-', '')}`;
  readonly namespace = Prisma.raw(`"${this.schema}"`);
  readonly admin: PrismaClient;
  readonly client: PrismaClient;
  historicalSnapshot: unknown = undefined;
  private created = false;

  constructor() {
    const connectionString = disposableUrl();
    this.admin = new PrismaClient({
      adapter: new PrismaPg({ connectionString, max: 2 }),
    });
    this.client = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString, max: 2 },
        { schema: this.schema },
      ),
    });
  }

  async initialize() {
    const n = this.namespace;
    await this.admin.$executeRaw`CREATE SCHEMA ${n}`;
    this.created = true;
    await this.admin.$executeRaw`CREATE TYPE ${n}."TaskStatus" AS ENUM
      ('todo','in_progress','in_review','done','not_relevant','failed')`;
    await this.admin.$executeRaw`CREATE TYPE ${n}."TaskAutomationStatus" AS ENUM
      ('AUTOMATED','MANUAL')`;
    await this.admin
      .$executeRaw`CREATE TYPE ${n}."EvidenceAutomationRunStatus" AS ENUM
      ('pending','running','completed','failed','cancelled')`;
    await this.admin
      .$executeRaw`CREATE TYPE ${n}."EvidenceAutomationEvaluationStatus" AS ENUM
      ('pass','fail')`;
    await this.admin.$executeRaw`CREATE TABLE ${n}."Organization" (
      id TEXT PRIMARY KEY, "evidenceApprovalEnabled" BOOLEAN NOT NULL)`;
    await this.admin.$executeRaw`CREATE TABLE ${n}."Task" (
      id TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "taskTemplateId" TEXT,
      status ${n}."TaskStatus" NOT NULL DEFAULT 'failed',
      "automationStatus" ${n}."TaskAutomationStatus" NOT NULL DEFAULT 'AUTOMATED',
      "archivedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL,
      "lastCompletedAt" TIMESTAMP(3), "approverId" TEXT)`;
    await this.admin.$executeRaw`CREATE TABLE ${n}."EvidenceAutomation" (
      id TEXT PRIMARY KEY, "taskId" TEXT NOT NULL, "isEnabled" BOOLEAN NOT NULL,
      "evaluationCriteria" TEXT)`;
    await this.admin.$executeRaw`CREATE TABLE ${n}."EvidenceAutomationVersion" (
      id TEXT PRIMARY KEY, "evidenceAutomationId" TEXT NOT NULL, version INTEGER NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL, "scriptKey" TEXT NOT NULL)`;
    await this.admin.$executeRaw`CREATE TABLE ${n}."EvidenceAutomationRun" (
      id TEXT PRIMARY KEY, "evidenceAutomationId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
      "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
      status ${n}."EvidenceAutomationRunStatus" NOT NULL, success BOOLEAN,
      "evaluationStatus" ${n}."EvidenceAutomationEvaluationStatus", version INTEGER)`;
    await this.admin.$executeRaw`INSERT INTO ${n}."EvidenceAutomationRun"
      (id,"evidenceAutomationId","createdAt","updatedAt",status)
      VALUES ('historical','historical',${NOW},${NOW},'completed')`;
    const migration = Prisma.raw(readFileSync(MIGRATION, 'utf8'));
    await this.admin.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT set_config('search_path', ${this.schema}, true)`;
      await transaction.$executeRaw(migration);
    });
    const rows = await this.admin.$queryRaw<
      Array<{ evaluationCriteriaSnapshot: string | null }>
    >`SELECT "evaluationCriteriaSnapshot" FROM ${n}."EvidenceAutomationRun" WHERE id='historical'`;
    this.historicalSnapshot = rows[0]?.evaluationCriteriaSnapshot;
  }

  async seed() {
    const n = this.namespace;
    await this.admin
      .$executeRaw`TRUNCATE ${n}."EvidenceAutomationRun",${n}."EvidenceAutomationVersion",
      ${n}."EvidenceAutomation",${n}."Task",${n}."Organization"`;
    await this.admin
      .$executeRaw`INSERT INTO ${n}."Organization" VALUES (${ORG},true)`;
    await this.admin.$executeRaw`INSERT INTO ${n}."Task"
      (id,"organizationId","taskTemplateId","updatedAt")
      VALUES (${TASK},${ORG},'frk_tt_68e52b26bf0e656af9e4e9c3',${NOW})`;
    await this.admin.$executeRaw`INSERT INTO ${n}."EvidenceAutomation"
      VALUES (${AUTOMATION},${TASK},true,${CRITERIA})`;
    await this.admin.$executeRaw`INSERT INTO ${n}."EvidenceAutomationVersion"
      VALUES ('version-2',${AUTOMATION},2,${NOW},'v2')`;
    await this.admin.$executeRaw`INSERT INTO ${n}."EvidenceAutomationRun"
      (id,"evidenceAutomationId","createdAt","updatedAt","startedAt","completedAt",status,
        success,"evaluationStatus",version,"evaluationCriteriaSnapshot")
      VALUES ('latest-run',${AUTOMATION},${NOW},${NOW},${NOW},${NOW},'completed',true,'pass',2,${CRITERIA})`;
  }

  async close() {
    try {
      await this.client.$disconnect();
      if (this.created) {
        await this.admin.$executeRaw`DROP SCHEMA ${this.namespace} CASCADE`;
      }
    } finally {
      await this.admin.$disconnect();
    }
  }
}
