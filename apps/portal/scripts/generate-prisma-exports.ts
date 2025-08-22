import { $Enums } from '@prisma/client';
import { writeFileSync } from 'fs';

const enumKeys = Object.keys($Enums);

const content = `// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
import { $Enums, Prisma, PrismaClient } from "@prisma/client";
export { Prisma, PrismaClient } from "@prisma/client";
export type * from "@prisma/client";
export { db } from "./client";
export { $Enums };

${enumKeys.map((k) => `export const ${k} = $Enums.${k};`).join('\n')}
`;

writeFileSync('prisma/index.ts', content);
console.log('✅ prisma/index.ts regenerated with enums');
