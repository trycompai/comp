#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace the generator block (handles both prisma-client and prisma-client-js)
schema = schema.replace(
  /generator client \{[^}]*\}/s,
  `generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}`
);

fs.writeFileSync(schemaPath, schema);
console.log('[patch-schema] Set generator to prisma-client-js (default output)');
