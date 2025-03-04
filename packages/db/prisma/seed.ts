import { PrismaClient } from "@prisma/client";
import type { Frequency, Prisma } from "@prisma/client";
import { RequirementType } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import fs from "node:fs";
import type {
  FrameworkCategory,
  Framework,
  Control,
  Policy,
} from "./seedTypes";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "development") {
    console.log("\n🗑️  Cleaning up existing data...");
    await prisma.organizationFramework.deleteMany();
    await prisma.organizationCategory.deleteMany();
    await prisma.organizationControl.deleteMany();
    await prisma.organizationPolicy.deleteMany();
    await prisma.organizationControlRequirement.deleteMany();
    await prisma.organizationEvidence.deleteMany();

    await prisma.policy.deleteMany();
    await prisma.policyControl.deleteMany();
    await prisma.policyFramework.deleteMany();

    await prisma.control.deleteMany();
    await prisma.controlRequirement.deleteMany();

    await prisma.framework.deleteMany();
    await prisma.frameworkCategory.deleteMany();

    await prisma.evidence.deleteMany();

    console.log("✅ Database cleaned");
  }

  console.log("\n📋 Seeding policies...");
  await seedPolicies();
  console.log("✅ Policies seeded");

  console.log("\n🏗️  Seeding frameworks...");
  await seedFrameworks();
  console.log("✅ Frameworks seeded");

  console.log("\n🔗 Seeding policy frameworks...");
  await seedPolicyFramework();
  console.log("✅ Policy frameworks seeded");

  console.log("\n🔗 Seeding evidence");
  await seedEvidence();
  console.log("✅ Evidence seeded");

  console.log("\n🎉 All data seeded successfully!");
}

main()
  .catch((e) => {
    console.error("\n❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function seedPolicies() {
  const policiesDir = join(__dirname, "../../data/policies");
  const policyFiles = readdirSync(policiesDir).filter((file) =>
    file.endsWith(".json")
  );

  console.log(`📄 Found ${policyFiles.length} policy files to process`);

  for (const file of policyFiles) {
    console.log(`  ⏳ Processing ${file}...`);

    try {
      const fileContent = readFileSync(join(policiesDir, file), "utf8");
      const policyData = JSON.parse(fileContent) as Policy;

      // Check for any existing policies with the same slug
      const existingPolicyWithSlug = await prisma.policy.findFirst({
        where: {
          slug: policyData.metadata.slug,
          NOT: { id: policyData.metadata.id },
        },
      });

      // If there's a conflict, delete the existing policy
      if (existingPolicyWithSlug) {
        console.log(
          `    ⚠️  Found existing policy with slug "${policyData.metadata.slug}", replacing it...`
        );
        await prisma.policy.delete({
          where: { id: existingPolicyWithSlug.id },
        });
      }

      // Now we can safely upsert the new policy
      await prisma.policy.upsert({
        where: {
          id: policyData.metadata.id,
        },
        update: {
          name: policyData.metadata.name,
          slug: policyData.metadata.slug,
          description: policyData.metadata.description,
          content: policyData.content as Prisma.InputJsonValue[],
          usedBy: policyData.metadata.usedBy as Prisma.InputJsonValue,
          frequency: policyData.metadata?.frequency ?? null,
        },
        create: {
          id: policyData.metadata.id,
          slug: policyData.metadata.slug,
          name: policyData.metadata.name,
          description: policyData.metadata.description,
          content: policyData.content as Prisma.InputJsonValue[],
          usedBy: policyData.metadata.usedBy as Prisma.InputJsonValue,
          frequency: policyData.metadata?.frequency ?? null,
        },
      });
      console.log(`  ✅ ${file} processed`);
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error);
      if (error instanceof Error) {
        console.error(`     Error details: ${error.message}`);
      }
    }
  }
}

async function seedFrameworks() {
  const frameworksFile = join(__dirname, "../../data/frameworks.json");
  const frameworksJson = JSON.parse(
    readFileSync(frameworksFile, "utf8")
  ) as Record<string, Framework>;

  console.log(
    `🔍 Found ${Object.keys(frameworksJson).length} frameworks to process`
  );

  // Populate the app level frameworks that every org has access to.
  for (const [frameworkId, frameworkData] of Object.entries(frameworksJson)) {
    console.log(`  ⏳ Processing framework: ${frameworkData.name}...`);
    // First, upsert the framework itself.
    const insertedFramework = await prisma.framework.upsert({
      where: { id: frameworkId },
      update: {
        description: frameworkData.description,
        version: frameworkData.version,
      },
      create: {
        id: frameworkId,
        name: frameworkData.name,
        description: frameworkData.description,
        version: frameworkData.version,
      },
    });

    // Then, upsert the framework categories.
    await seedFrameworkCategories(insertedFramework.id);
    console.log(`  ✅ Framework ${frameworkData.name} processed`);
  }
}

async function seedFrameworkCategories(frameworkId: string) {
  let categories: string;

  try {
    categories = fs.readFileSync(
      join(__dirname, `../../data/categories/${frameworkId}.json`),
      "utf8"
    );
  } catch (error) {
    console.log(
      `  ⚠️  No categories found for framework ${frameworkId}, skipping`
    );
    return;
  }

  const categoriesData = JSON.parse(categories) as Record<
    string,
    FrameworkCategory
  >;

  console.log(
    `    📑 Found ${Object.keys(categoriesData).length} categories for ${frameworkId}`
  );

  // Upsert the framework categories for the given framework.
  for (const [categoryCode, categoryData] of Object.entries(categoriesData)) {
    console.log(`      ⏳ Processing category: ${categoryData.name}...`);
    // First, upsert the framework category itself for the given framework.
    await prisma.frameworkCategory.upsert({
      where: { id: categoryCode },
      update: {
        name: categoryData.name,
        code: categoryData.code,
        description: categoryData.description,
        frameworkId: frameworkId,
      },
      create: {
        id: categoryCode,
        name: categoryData.name,
        description: categoryData.description,
        code: categoryData.code,
        frameworkId: frameworkId,
      },
    });

    // Then, upsert the controls for the given framework category.
    await seedFrameworkCategoryControls(frameworkId, categoryCode);
    console.log(`      ✅ Category ${categoryData.name} processed`);
  }
}

async function seedFrameworkCategoryControls(
  frameworkId: string,
  categoryCode: string
) {
  const controls = fs.readFileSync(
    join(__dirname, `../../data/controls/${frameworkId}.json`),
    "utf8"
  );

  const controlsData = JSON.parse(controls) as Record<string, Control>;

  const filteredControlsData = Object.fromEntries(
    Object.entries(controlsData).filter(
      ([_, data]) => data.categoryId === categoryCode
    )
  );

  console.log(
    `        🎮 Processing ${Object.keys(filteredControlsData).length} controls`
  );

  for (const [controlCode, controlData] of Object.entries(
    filteredControlsData
  )) {
    // First, upsert the controls itself for the given category.
    const insertedControl = await prisma.control.upsert({
      where: { code: controlCode },
      update: {
        name: controlData.name,
        description: controlData.description,
        domain: controlData.domain,
        frameworkCategoryId: categoryCode,
      },
      create: {
        // Use the control code (e.g. CC1.1) as both the id and code
        id: controlCode,
        code: controlCode,
        name: controlData.name,
        description: controlData.description,
        domain: controlData.domain,
        frameworkCategoryId: categoryCode,
      },
    });

    // Then, upsert the requirements for the given control.
    console.log(
      `          📝 Processing ${controlData.requirements.length} requirements for ${controlCode}`
    );
    for (const requirement of controlData.requirements) {
      // For policy requirements, verify the policy exists first
      if (requirement.type === "policy" && requirement.policyId) {
        const policy = await prisma.policy.findUnique({
          where: { id: requirement.policyId },
        });

        if (!policy) {
          console.log(
            `  ⚠️  Policy ${requirement.policyId} not found for requirement ${requirement.id}, skipping`
          );
          continue;
        }
      }

      await prisma.controlRequirement.upsert({
        where: {
          id: requirement.id,
        },
        create: {
          id: requirement.id,
          controlId: controlCode,
          name: requirement.name,
          type: requirement.type as RequirementType,
          description: requirement.description,
          policyId:
            (requirement.type as RequirementType) === "policy"
              ? requirement.policyId
              : null,
          frequency: requirement?.frequency ?? null,
        },
        update: {
          name: requirement.name,
          description: requirement.description,
          policyId:
            (requirement.type as RequirementType) === "policy"
              ? requirement.policyId
              : null,
          frequency: requirement?.frequency ?? null,
        },
      });
    }
  }
}

async function seedPolicyFramework() {
  const policies = await prisma.policy.findMany();
  console.log(
    `🔄 Processing ${policies.length} policies for framework mapping`
  );

  for (const policy of policies) {
    console.log(`  ⏳ Mapping policy: ${policy.name}...`);
    if (!policy.usedBy) {
      console.log(`  ⚠️  Policy ${policy.name} has no usedBy, skipping`);
      continue;
    }

    for (const [frameworkId, controlCodes] of Object.entries(
      policy.usedBy as Record<string, string[]>
    )) {
      // First verify the framework exists
      const framework = await prisma.framework.findUnique({
        where: { id: frameworkId },
      });

      if (!framework) {
        console.log(`  ⚠️  Framework ${frameworkId} not found, skipping`);
        continue;
      }

      // Upsert the policy framework mapping
      await prisma.policyFramework.upsert({
        where: { id: `${frameworkId}_${policy.id}` },
        update: {
          policyId: policy.id,
          frameworkId: frameworkId,
        },
        create: {
          id: `${frameworkId}_${policy.id}`,
          policyId: policy.id,
          frameworkId: frameworkId,
        },
      });

      // For each control code, create the policy control mapping directly
      for (const controlCode of controlCodes) {
        console.log(
          `          ⏳ Mapping control ${controlCode} to policy ${policy.name}`
        );
        // Now create the policy control mapping using the control code directly
        await prisma.policyControl.upsert({
          where: {
            id: `${frameworkId}_${policy.id}_${controlCode}`,
          },
          update: {
            policyId: policy.id,
            controlId: controlCode, // Use the control code directly
          },
          create: {
            id: `${frameworkId}_${policy.id}_${controlCode}`,
            policyId: policy.id,
            controlId: controlCode, // Use the control code directly
          },
        });
      }
    }
    console.log(`  ✅ Policy ${policy.name} mapped`);
  }
}

async function seedEvidence() {
  const evidenceRequirements = await prisma.controlRequirement.findMany({
    where: {
      type: RequirementType.evidence,
    },
  });

  console.log(`🔄 Processing ${evidenceRequirements.length} evidences`);

  for (const evidenceReq of evidenceRequirements) {
    console.log(`  ⏳ Processing evidence: ${evidenceReq.name}...`);

    // Create the evidence record with the same ID as the requirement
    const evidence = await prisma.evidence.upsert({
      where: {
        id: evidenceReq.id,
      },
      update: {
        name: evidenceReq.name,
        description: evidenceReq.description,
        frequency: evidenceReq.frequency ?? null,
      },
      create: {
        id: evidenceReq.id,
        name: evidenceReq.name,
        description: evidenceReq.description,
        frequency: evidenceReq.frequency ?? null,
      },
    });

    // Update the control requirement to link back to the evidence
    await prisma.controlRequirement.update({
      where: {
        id: evidenceReq.id,
      },
      data: {
        evidenceId: evidence.id,
      },
    });

    console.log(`  ✅ Evidence ${evidenceReq.name} processed and linked`);
  }
}
