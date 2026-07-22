import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { frameworkEditorModelSchemas } from './frameworkEditorSchemas';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function seedJsonFiles(subDirectory: string) {
  const directoryPath = path.join(__dirname, subDirectory);
  console.log(`Starting to seed files from: ${directoryPath}`);
  const files = await fs.readdir(directoryPath);
  const jsonFiles = files.filter((file) => file.endsWith('.json'));

  // Ensure deterministic order for primitives so FK dependencies are satisfied
  // Specifically, seed Frameworks before Requirements (which reference Frameworks)
  if (subDirectory === 'primitives') {
    const priorityOrder = ['FrameworkEditorFramework.json'];
    const getPriority = (fileName: string) => {
      const index = priorityOrder.indexOf(fileName);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    jsonFiles.sort((a, b) => getPriority(a) - getPriority(b));
  }

  for (const jsonFile of jsonFiles) {
    try {
      const filePath = path.join(directoryPath, jsonFile);
      const jsonContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        console.log(`Skipping empty or invalid JSON file: ${jsonFile}`);
        continue;
      }

      if (subDirectory === 'primitives') {
        const modelNameForPrisma = jsonFile.replace('.json', '');
        const prismaModelKey =
          modelNameForPrisma.charAt(0).toLowerCase() + modelNameForPrisma.slice(1);
        const zodModelKey = modelNameForPrisma as keyof typeof frameworkEditorModelSchemas;

        const prismaAny = prisma as any;
        if (
          !prismaAny[prismaModelKey] ||
          typeof prismaAny[prismaModelKey].createMany !== 'function'
        ) {
          console.warn(
            `Model ${prismaModelKey} not found on Prisma client or does not support createMany. Skipping ${jsonFile}.`,
          );
          continue;
        }

        const zodSchema = frameworkEditorModelSchemas[zodModelKey];
        if (!zodSchema) {
          console.warn(
            `Zod schema not found for model ${String(zodModelKey)}. Skipping validation for ${jsonFile}.`,
          );
        } else {
          console.log(
            `Validating ${jsonData.length} records from ${jsonFile} against ${String(zodModelKey)} schema...`,
          );
          for (const item of jsonData) {
            try {
              zodSchema.parse(item);
            } catch (validationError) {
              console.error(
                `Validation failed for an item in ${jsonFile} for model ${String(zodModelKey)}:`,
                item,
              );
              console.error('Validation errors:', validationError);
              throw new Error(`Data validation failed for ${jsonFile}.`);
            }
          }
          console.log(`Validation successful for ${jsonFile}.`);
        }

        const processedData = jsonData.map((item) => {
          const newItem = { ...item };
          if (newItem.createdAt && typeof newItem.createdAt === 'string') {
            newItem.createdAt = new Date(newItem.createdAt);
          }
          if (newItem.updatedAt && typeof newItem.updatedAt === 'string') {
            newItem.updatedAt = new Date(newItem.updatedAt);
          }
          return newItem;
        });

        console.log(
          `Seeding ${processedData.length} records from ${jsonFile} into ${prismaModelKey}...`,
        );

        // Use upsert to update existing records instead of skipping them
        for (const record of processedData) {
          await prismaAny[prismaModelKey].upsert({
            where: { id: record.id },
            create: record,
            update: record,
          });
        }

        console.log(`Finished seeding ${jsonFile} from primitives.`);
      } else if (subDirectory === 'relations') {
        // Expected filename format: _ModelAToModelB.json
        if (!jsonFile.startsWith('_') || !jsonFile.includes('To')) {
          console.warn(`Skipping relation file with unexpected format: ${jsonFile}`);
          continue;
        }

        const modelNamesPart = jsonFile.substring(1, jsonFile.indexOf('.json'));
        const [modelANamePascal, modelBNamePascal] = modelNamesPart.split('To');

        if (!modelANamePascal || !modelBNamePascal) {
          console.warn(`Could not parse model names from relation file: ${jsonFile}`);
          continue;
        }

        const prismaModelAName =
          modelANamePascal.charAt(0).toLowerCase() + modelANamePascal.slice(1);
        // Infer relation field name on ModelA: pluralized, camelCased ModelB name
        // e.g., if ModelB is FrameworkEditorPolicyTemplate, relation field is frameworkEditorPolicyTemplates
        // This is a common convention, but might need adjustment based on actual schema
        let relationFieldNameOnModelA =
          modelBNamePascal.charAt(0).toLowerCase() + modelBNamePascal.slice(1);
        if (!relationFieldNameOnModelA.endsWith('s')) {
          // basic pluralization
          relationFieldNameOnModelA += 's';
        }

        // Special handling for 'Requirement' -> 'requirements' (already plural)
        // and other specific cases if 's' isn't the right pluralization.
        // For now, using a direct map for known cases from the user's file names.
        if (modelBNamePascal === 'FrameworkEditorPolicyTemplate') {
          relationFieldNameOnModelA = 'policyTemplates';
        } else if (modelBNamePascal === 'FrameworkEditorRequirement') {
          relationFieldNameOnModelA = 'requirements';
        } else if (modelBNamePascal === 'FrameworkEditorTaskTemplate') {
          relationFieldNameOnModelA = 'taskTemplates';
        }

        const prismaAny = prisma as any;
        if (
          !prismaAny[prismaModelAName] ||
          typeof prismaAny[prismaModelAName].update !== 'function'
        ) {
          console.warn(
            `Model ${prismaModelAName} not found on Prisma client or does not support update. Skipping ${jsonFile}.`,
          );
          continue;
        }

        console.log(
          `Processing relations from ${jsonFile} for ${prismaModelAName} to connect via ${relationFieldNameOnModelA}...`,
        );
        let connectionsMade = 0;
        for (const relationItem of jsonData) {
          if (!relationItem.A || !relationItem.B) {
            console.warn(`Skipping invalid relation item in ${jsonFile}:`, relationItem);
            continue;
          }
          const idA = relationItem.A;
          const idB = relationItem.B;

          try {
            await prismaAny[prismaModelAName].update({
              where: { id: idA },
              data: {
                [relationFieldNameOnModelA]: {
                  connect: { id: idB },
                },
              },
            });
            connectionsMade++;
          } catch (error) {
            console.error(
              `Failed to connect ${prismaModelAName} (${idA}) with ${modelBNamePascal} (${idB}) from ${jsonFile}:`,
              error,
            );
            // Decide if one error should stop the whole process for this file or continue
          }
        }
        console.log(`Finished processing ${jsonFile}. Made ${connectionsMade} connections.`);
      }
    } catch (error) {
      console.error(`Error processing ${jsonFile}:`, error);
      throw error;
    }
  }
}

// ISMS foundational document templates (CS-437). Mirrors
// apps/api/src/isms/utils/document-types.ts ISMS_TYPE_DEFINITIONS — that file is
// the single source of truth; this is kept in sync here because the seed (in
// @trycompai/db) cannot import the API's `@db`-aliased module. Requirement links
// are NOT seeded — the clause fallback resolves them and links are authored in
// the editor.
const ISMS_DOCUMENT_TEMPLATES = [
  {
    documentType: 'context_of_organization',
    name: 'Context of the Organization',
    clause: '4.1',
    description:
      'Internal and external issues relevant to the ISMS and their effect on its intended outcomes (ISO 27001 clause 4.1).',
  },
  {
    documentType: 'interested_parties_register',
    name: 'Interested Parties Register',
    clause: '4.2',
    description:
      'The interested parties relevant to the ISMS together with their needs and expectations (ISO 27001 clause 4.2).',
  },
  {
    documentType: 'interested_parties_requirements',
    name: 'Interested Parties Requirements',
    clause: '4.2',
    description:
      'The requirements of interested parties and how the ISMS addresses them (ISO 27001 clause 4.2).',
  },
  {
    documentType: 'isms_scope',
    name: 'ISMS Scope',
    clause: '4.3',
    description:
      'The boundaries and applicability of the ISMS, including the interfaces and dependencies considered (ISO 27001 clause 4.3).',
  },
  {
    documentType: 'leadership_commitment',
    name: 'Leadership and Commitment',
    clause: '5.1',
    description:
      'Evidence of top management leadership and commitment to the ISMS (ISO 27001 clause 5.1).',
  },
  {
    documentType: 'roles_and_responsibilities',
    name: 'Roles, Responsibilities and Authorities',
    clause: '5.3',
    description:
      'The ISMS governance roles, their responsibilities and authorities, and the members who hold them (ISO 27001 clause 5.3).',
  },
  {
    documentType: 'objectives_plan',
    name: 'Information Security Objectives and Plan',
    clause: '6.2',
    description:
      'Measurable information security objectives and the plan to achieve them (ISO 27001 clause 6.2).',
  },
  {
    documentType: 'monitoring',
    name: 'Monitoring, Measurement, Analysis and Evaluation',
    clause: '9.1',
    description:
      'The metrics the organization monitors — what is measured, how, when, by whom, and who analyses the results (ISO 27001 clause 9.1).',
  },
  {
    documentType: 'internal_audit',
    name: 'Internal Audit',
    clause: '9.2',
    description:
      'The internal audit programme and the plan, controls tested, findings and conclusion of each internal audit of the ISMS (ISO 27001 clause 9.2).',
  },
] as const;

async function seedIsmsDocumentTemplates() {
  for (let i = 0; i < ISMS_DOCUMENT_TEMPLATES.length; i++) {
    const template = ISMS_DOCUMENT_TEMPLATES[i];
    await prisma.frameworkEditorIsmsDocumentTemplate.upsert({
      where: { documentType: template.documentType },
      create: {
        documentType: template.documentType,
        name: template.name,
        description: template.description,
        clause: template.clause,
        sortOrder: i,
      },
      update: {
        name: template.name,
        description: template.description,
        clause: template.clause,
        sortOrder: i,
      },
    });
  }
  console.log(
    `Seeded ${ISMS_DOCUMENT_TEMPLATES.length} ISMS document templates.`,
  );
}

async function backfillFrameworkScopedLinks() {
  const fis = await prisma.frameworkInstance.findMany({ select: { id: true } });
  for (const fi of fis) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "FrameworkControlPolicyLink" ("frameworkInstanceId", "controlId", "policyId")
      SELECT DISTINCT $1, cp."A", cp."B"
      FROM "_ControlToPolicy" cp
      WHERE cp."A" IN (
        SELECT DISTINCT "controlId" FROM "RequirementMap"
        WHERE "frameworkInstanceId" = $1 AND "archivedAt" IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM "FrameworkControlPolicyLink" fpl
        WHERE fpl."frameworkInstanceId" = $1
          AND fpl."controlId" = cp."A" AND fpl."policyId" = cp."B"
      )
    `, fi.id);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "FrameworkControlTaskLink" ("frameworkInstanceId", "controlId", "taskId")
      SELECT DISTINCT $1, ct."A", ct."B"
      FROM "_ControlToTask" ct
      WHERE ct."A" IN (
        SELECT DISTINCT "controlId" FROM "RequirementMap"
        WHERE "frameworkInstanceId" = $1 AND "archivedAt" IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM "FrameworkControlTaskLink" ftl
        WHERE ftl."frameworkInstanceId" = $1
          AND ftl."controlId" = ct."A" AND ftl."taskId" = ct."B"
      )
    `, fi.id);

    await prisma.$executeRawUnsafe(`
      INSERT INTO "FrameworkControlDocumentTypeLink" ("frameworkInstanceId", "controlId", "formType")
      SELECT DISTINCT $1, cdt."controlId", cdt."formType"
      FROM "ControlDocumentType" cdt
      WHERE cdt."controlId" IN (
        SELECT DISTINCT "controlId" FROM "RequirementMap"
        WHERE "frameworkInstanceId" = $1 AND "archivedAt" IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM "FrameworkControlDocumentTypeLink" fdl
        WHERE fdl."frameworkInstanceId" = $1
          AND fdl."controlId" = cdt."controlId" AND fdl."formType" = cdt."formType"
      )
    `, fi.id);
  }
}

async function main() {
  try {
    await seedJsonFiles('primitives');
    await seedIsmsDocumentTemplates();
    await seedJsonFiles('relations');
    // Build v1.0.0 FrameworkVersion snapshots for any framework without one.
    // On a fresh `migrate reset`, the backfill data migration runs against empty
    // tables and is a no-op; seed then creates the framework rows. Without this
    // call, local onboarding would fail because it reads from FrameworkVersion.
    const { backfillFrameworkVersions } = await import(
      '../../src/scripts/backfill-framework-versions'
    );
    const result = await backfillFrameworkVersions();
    console.log('FrameworkVersion backfill:', result);

    await backfillFrameworkScopedLinks();
    console.log('Framework-scoped link backfill complete.');

    await prisma.$disconnect();
    console.log('Seeding completed successfully for primitives and relations.');
  } catch (error: unknown) {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
