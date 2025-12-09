import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { frameworkEditorModelSchemas } from './frameworkEditorSchemas';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

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

async function main() {
  try {
    await seedJsonFiles('primitives');
    await seedJsonFiles('relations');
    await prisma.$disconnect();
    console.log('Seeding completed successfully for primitives and relations.');
  } catch (error: unknown) {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
