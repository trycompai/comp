#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Generating local Prisma client from @trycompai/db package...');

try {
  const targetSchemaPath = './prisma/schema.prisma';

  // Ensure prisma directory exists
  if (!fs.existsSync('./prisma')) {
    fs.mkdirSync('./prisma', { recursive: true });
  }

  // Try to find the schema in the published @trycompai/db package
  const possibleSchemaPaths = [
    './node_modules/@trycompai/db/dist/schema.prisma',
    './node_modules/@trycompai/db/prisma/schema.prisma',
    './node_modules/@trycompai/db/schema.prisma',
    './node_modules/@trycompai/db/dist/generated/prisma/schema.prisma',
    // Fallback to local packages (temporary during development)
    '../../packages/db/prisma/schema.prisma',
  ];

  let sourceSchemaPath = null;
  let schemaContent = null;

  // Try to find the schema in the published package
  for (const schemaPath of possibleSchemaPaths) {
    if (fs.existsSync(schemaPath)) {
      sourceSchemaPath = schemaPath;
      console.log(`✅ Found schema at: ${schemaPath}`);
      schemaContent = fs.readFileSync(sourceSchemaPath, 'utf8');
      break;
    }
  }

  if (!sourceSchemaPath) {
    console.log('⚠️  Schema not found in @trycompai/db package.');
    console.log('📦 Creating minimal schema for now. You may need to:');
    console.log('   1. Ensure @trycompai/db is properly published with schema');
    console.log('   2. Update the schema paths in this script');

    // Create a minimal schema as fallback using the custom ID generation pattern
    schemaContent = `// Minimal schema - replace with actual schema from @trycompai/db
generator client {
  provider        = "prisma-client-js"
  output          = "../node_modules/.prisma/client"
  previewFeatures = ["postgresqlExtensions"]
  binaryTargets   = ["native", "rhel-openssl-3.0.x"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DATABASE_URL")
  extensions = [pgcrypto]
}

// Add your models here - this is a fallback
model User {
  id String @id @default(dbgenerated("generate_prefixed_cuid('usr'::text)"))
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;

    console.log('✅ Created minimal schema as fallback');
  } else {
    // Found schema in package, modify it to output locally
    console.log('🔧 Modifying schema for local generation...');

    // Replace or add the generator to output locally
    if (schemaContent.includes('generator client')) {
      // Replace existing generator
      schemaContent = schemaContent.replace(
        /generator client \{[\s\S]*?\}/,
        `generator client {
  provider        = "prisma-client-js"
  output          = "../node_modules/.prisma/client"
  previewFeatures = ["postgresqlExtensions"]
  binaryTargets   = ["native", "rhel-openssl-3.0.x"]
}`,
      );
    } else {
      // Add generator at the beginning
      schemaContent = `generator client {
  provider        = "prisma-client-js"
  output          = "../node_modules/.prisma/client"
  previewFeatures = ["postgresqlExtensions"]
  binaryTargets   = ["native", "rhel-openssl-3.0.x"]
}

${schemaContent}`;
    }

    console.log('✅ Schema modified for local generation');
  }

  // Write the schema locally
  fs.writeFileSync(targetSchemaPath, schemaContent);
  console.log('✅ Schema written to local prisma directory');

  // Generate the client
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  console.log('✅ Prisma client generated successfully!');
} catch (error) {
  console.error('❌ Error generating Prisma client:', error.message);
  process.exit(1);
}
