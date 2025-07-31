#!/usr/bin/env node

const fs = require('fs');
const glob = require('glob');

console.log('🔄 Updating database imports to use local client...');

// Find all TypeScript/TSX files in src directory
const files = glob.sync('src/**/*.{ts,tsx}', {
  cwd: process.cwd(),
  absolute: true,
});

let filesUpdated = 0;

files.forEach((filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  let hasChanges = false;

  // Pattern 1: Replace db imports to use local client
  const dbImportPattern = /import\s*{\s*db\s*}\s*from\s*['"]@trycompai\/db['"];?/g;
  if (dbImportPattern.test(newContent)) {
    newContent = newContent.replace(dbImportPattern, "import { db } from '@/lib/db';");
    hasChanges = true;
  }

  // Pattern 2: Replace type-only imports to use @prisma/client
  const typeImportPattern = /import\s*(?:type\s*)?\s*{([^}]+)}\s*from\s*['"]@trycompai\/db['"];?/g;
  newContent = newContent.replace(typeImportPattern, (match, types) => {
    // Skip if it includes 'db' (non-type import)
    if (types.includes(' db') || types.startsWith('db') || types.endsWith('db ')) {
      return match; // Don't change mixed imports, they'll be handled separately
    }
    hasChanges = true;
    return `import type { ${types} } from '@prisma/client';`;
  });

  // Pattern 3: Handle mixed imports (db + types)
  const mixedImportPattern = /import\s*{\s*([^}]*db[^}]*)\s*}\s*from\s*['"]@trycompai\/db['"];?/g;
  newContent = newContent.replace(mixedImportPattern, (match, imports) => {
    const parts = imports.split(',').map((part) => part.trim());
    const dbImports = parts.filter((part) => part === 'db');
    const typeImports = parts.filter((part) => part !== 'db' && part !== '');

    let replacement = '';
    if (dbImports.length > 0) {
      replacement += "import { db } from '@/lib/db';\n";
    }
    if (typeImports.length > 0) {
      replacement += `import type { ${typeImports.join(', ')} } from '@prisma/client';`;
    }

    hasChanges = true;
    return replacement;
  });

  if (hasChanges) {
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Updated: ${filePath.replace(process.cwd() + '/', '')}`);
    filesUpdated++;
  }
});

console.log(`🎉 Updated ${filesUpdated} files!`);
console.log('📝 All imports now use local Prisma client');
