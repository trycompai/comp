/**
 * This script gets executed before a 'prisma db push'
 * It checks if the generate_prefixed_cuid function exists and creates it if it doesn't
 */
const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Running pre-db-push script...');

  // Get the database URL from environment
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/comp';
  const functionSqlPath = path.resolve(__dirname, '../prisma/functionDefinition.sql');

  // First check if the function exists using a SQL query
  console.log('Checking if generate_prefixed_cuid function exists...');
  
  try {
    const result = execSync(
      `psql "${databaseUrl}" -t -c "SELECT 1 FROM pg_proc WHERE proname = 'generate_prefixed_cuid'"`, 
      { stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString().trim();
    
    if (result === '1') {
      console.log('✅ generate_prefixed_cuid function already exists');
      process.exit(0);
    }
  } catch (error) {
    // If the query fails, just continue and try to create the function
    console.log('Could not check if function exists, will try to create it anyway');
  }

  console.log('Creating generate_prefixed_cuid function...');
  execSync(`psql "${databaseUrl}" -f "${functionSqlPath}"`, { stdio: 'inherit' });

  console.log('✅ Successfully created SQL function');
  process.exit(0);
} catch (error) {
  console.error('❌ Error in pre-db-push script:', error);
  // Don't exit with error to allow db push to continue and show its own errors
  process.exit(0);
}
