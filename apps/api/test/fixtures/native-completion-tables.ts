import { Prisma, type PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export async function initializeNativeCompletionTables({
  admin,
  namespace: n,
  schema,
}: {
  admin: PrismaClient;
  namespace: Prisma.Sql;
  schema: string;
}) {
  await admin.$executeRaw`CREATE TYPE ${n}."TaskFrequency" AS ENUM
    ('daily','weekly','monthly','quarterly','yearly')`;
  await admin.$executeRaw`ALTER TABLE ${n}."Task"
    ADD COLUMN frequency ${n}."TaskFrequency", ADD COLUMN "reviewDate" TIMESTAMP(3)`;
  await admin.$executeRaw`CREATE TYPE ${n}."IntegrationConnectionStatus" AS ENUM
    ('pending','active','error','paused','disconnected')`;
  await admin.$executeRaw`CREATE TYPE ${n}."IntegrationRunStatus" AS ENUM
    ('pending','running','success','failed','cancelled','inconclusive')`;
  await admin.$executeRaw`CREATE TABLE ${n}."IntegrationProvider" (
    id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, "isActive" BOOLEAN NOT NULL,
    "manifestHash" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL)`;
  await admin.$executeRaw`CREATE TABLE ${n}."IntegrationConnection" (
    id TEXT PRIMARY KEY, "providerId" TEXT NOT NULL, "organizationId" TEXT NOT NULL,
    status ${n}."IntegrationConnectionStatus" NOT NULL,
    metadata JSONB, variables JSONB, "activeCredentialVersionId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now())`;
  await admin.$executeRaw`CREATE TABLE ${n}."IntegrationCredentialVersion" (
    id TEXT PRIMARY KEY, "connectionId" TEXT NOT NULL, version INTEGER NOT NULL,
    "encryptedPayload" JSONB NOT NULL DEFAULT '{}', "expiresAt" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now())`;
  await admin.$executeRaw`CREATE TABLE ${n}."IntegrationCheckRun" (
    id TEXT PRIMARY KEY, "connectionId" TEXT NOT NULL, "taskId" TEXT,
    "checkId" TEXT NOT NULL, "checkName" TEXT NOT NULL DEFAULT 'Synthetic check',
    status ${n}."IntegrationRunStatus" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "durationMs" INTEGER,
    "totalChecked" INTEGER NOT NULL DEFAULT 0, "passedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0, "errorMessage" TEXT, logs JSONB,
    "scannedServices" TEXT[] NOT NULL DEFAULT '{}',
    "failedServices" TEXT[] NOT NULL DEFAULT '{}', "scanMode" TEXT)`;
  await admin.$executeRaw`CREATE TABLE ${n}."IntegrationCheckResult" (
    id TEXT PRIMARY KEY, "checkRunId" TEXT NOT NULL REFERENCES ${n}."IntegrationCheckRun"(id), passed BOOLEAN NOT NULL,
    "resourceId" TEXT NOT NULL, "resourceType" TEXT NOT NULL DEFAULT 'synthetic',
    title TEXT NOT NULL DEFAULT 'Synthetic check', description TEXT, severity TEXT,
    remediation TEXT, evidence JSONB, "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT now())`;
  await admin.$executeRaw`CREATE TABLE ${n}."FindingException" (
    id TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "connectionId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL, "resourceId" TEXT NOT NULL, reason TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3))`;
  await admin.$executeRaw`CREATE TABLE ${n}."DynamicIntegration" (
    id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, "isActive" BOOLEAN NOT NULL,
    "authConfig" JSONB NOT NULL DEFAULT '{"type":"api_key","config":{"name":"api_key"}}',
    "baseUrl" TEXT, "defaultHeaders" JSONB, "syncDefinition" JSONB, services JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL)`;
  await admin.$executeRaw`CREATE TABLE ${n}."DynamicCheck" (
    id TEXT PRIMARY KEY, "integrationId" TEXT NOT NULL REFERENCES ${n}."DynamicIntegration"(id),
    "checkSlug" TEXT NOT NULL, "isEnabled" BOOLEAN NOT NULL,
    "taskMapping" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
    name TEXT NOT NULL DEFAULT 'Synthetic check', description TEXT NOT NULL DEFAULT 'Synthetic metadata',
    definition JSONB NOT NULL DEFAULT '{"steps":[]}', "defaultSeverity" TEXT NOT NULL DEFAULT 'medium',
    variables JSONB NOT NULL DEFAULT '[]', service TEXT)`;
  await admin.$executeRaw`INSERT INTO ${n}."IntegrationCheckRun"
    (id,"connectionId","checkId",status,"createdAt")
    VALUES ('historical-native','historical','historical','success',now())`;
  const migration = Prisma.raw(
    readFileSync(
      resolve(
        __dirname,
        '../../../../packages/db/prisma/migrations/20261115083500_bind_native_task_evidence/migration.sql',
      ),
      'utf8',
    ),
  );
  await admin.$transaction(async (transaction) => {
    await transaction.$executeRaw`SELECT set_config('search_path', ${schema}, true)`;
    await transaction.$executeRaw(migration);
  });
  const rows = await admin.$queryRaw<
    Array<{ completionEvidenceBinding: string | null }>
  >`SELECT "completionEvidenceBinding" FROM ${n}."IntegrationCheckRun" WHERE id='historical-native'`;
  return rows[0]?.completionEvidenceBinding;
}

export async function resetNativeCompletionTables({
  admin,
  namespace: n,
}: {
  admin: PrismaClient;
  namespace: Prisma.Sql;
}) {
  await admin.$executeRaw`TRUNCATE ${n}."IntegrationProvider",${n}."IntegrationConnection",
    ${n}."IntegrationCredentialVersion",
    ${n}."IntegrationCheckRun",${n}."IntegrationCheckResult",${n}."FindingException",
    ${n}."DynamicCheck",${n}."DynamicIntegration"`;
}
