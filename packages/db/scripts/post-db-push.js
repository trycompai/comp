/**
 * This script gets executed after a 'prisma db push' 
 * It's used to ensure that the generate_prefixed_cuid function is created in PostgreSQL
 */
const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Running post-db-push script...');

  // Get the database URL from environment
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/comp';
  const functionSqlPath = path.resolve(__dirname, '../prisma/functionDefinition.sql');

  console.log('Creating generate_prefixed_cuid function...');
  execSync(`psql "${databaseUrl}" -f "${functionSqlPath}"`, { stdio: 'inherit' });

  console.log('✅ Successfully created SQL function');
} catch (error) {
  console.error('❌ Error in post-db-push script:', error);
  process.exit(1);
}
