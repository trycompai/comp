#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SCHEMA_DIR = path.join(__dirname, '../prisma/schema');
const BASE_SCHEMA = path.join(__dirname, '../prisma/schema.prisma');
const OUTPUT_DIR = path.join(__dirname, '../dist/prisma');
const OUTPUT_SCHEMA = path.join(OUTPUT_DIR, 'schema.prisma');

console.log('🔨 Combining Prisma schema files...');

// Read the base schema file
let combinedSchema = fs.readFileSync(BASE_SCHEMA, 'utf8');

// The base schema should be complete as-is (no modifications needed)

// Read all .prisma files from the schema directory
const schemaFiles = fs
  .readdirSync(SCHEMA_DIR)
  .filter((file) => file.endsWith('.prisma'))
  .sort(); // Sort for consistent output

console.log(`📁 Found ${schemaFiles.length} schema files to combine`);

// Append each schema file
schemaFiles.forEach((file) => {
  console.log(`  - Adding ${file}`);
  const content = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8');

  // Ensure we have proper line breaks
  combinedSchema += '\n\n';

  // Add a comment separator for clarity
  combinedSchema += `// ===== ${file} =====\n`;
  combinedSchema += content;

  // Ensure content ends with a newline
  if (!content.endsWith('\n')) {
    combinedSchema += '\n';
  }
});

// Ensure the output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Write the combined schema
fs.writeFileSync(OUTPUT_SCHEMA, combinedSchema);

console.log(`✅ Combined schema written to: ${OUTPUT_SCHEMA}`);
console.log(`📏 Total size: ${Math.round(combinedSchema.length / 1024)}KB`);

// Also copy SQL files if they exist
const sqlFiles = ['functionDefinition.sql', 'randomSecret.sql'];
sqlFiles.forEach((file) => {
  const src = path.join(__dirname, '../prisma', file);
  const dest = path.join(OUTPUT_DIR, file);

  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`📄 Copied ${file}`);
  }
});

console.log(`🎯 Schema built for distribution only - main development setup unchanged`);
console.log(`📂 Output directory: ${OUTPUT_DIR}`);
