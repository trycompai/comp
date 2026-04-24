#!/usr/bin/env node
// Create a Postgres database if it doesn't already exist.
// Usage:
//   node scripts/create-database.mjs <management-url> <db-name>
//
// The management URL should point at the `postgres` maintenance database
// on the same host/credentials as the target. Exits 0 on success (whether
// the DB was created or already existed).
import { Client } from 'pg';

const [mgmtUrl, dbName] = process.argv.slice(2);
if (!mgmtUrl || !dbName) {
  console.error('usage: node create-database.mjs <mgmt-url> <db-name>');
  process.exit(2);
}

const client = new Client({ connectionString: mgmtUrl });
try {
  await client.connect();
  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [dbName],
  );
  if (rowCount === 0) {
    // dbName is validated upstream (shell slug: [a-z0-9_]+), safe to interpolate.
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.error(`create-database: created ${dbName}`);
  } else {
    console.error(`create-database: ${dbName} already exists`);
  }
} finally {
  await client.end();
}
