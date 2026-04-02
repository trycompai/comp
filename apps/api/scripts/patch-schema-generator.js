#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Surgically patch the generator block: swap provider and remove output line.
// Preserves all other generator settings (previewFeatures, etc.).
schema = schema
  .replace(/provider\s*=\s*"prisma-client"/g, 'provider = "prisma-client-js"')
  .replace(/\s*output\s*=\s*"[^"]*"\n?/g, '\n');

fs.writeFileSync(schemaPath, schema);
console.log('[patch-schema] Set generator to prisma-client-js (default output)');
