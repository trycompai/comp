# Database Integration Guide

This package provides a combined Prisma schema file for your application.

## Schema-Only Distribution

The `@gideon-defender/db` package provides a single, combined schema file that includes all our database models. You generate your own Prisma client from this schema.

**What's included:**
- 📄 Combined Prisma schema file
- 🗂️ All database models and enums
- 🔗 Proper relationships and constraints

**Benefits:**
- ✅ Always up-to-date with your Prisma version
- ✅ No version conflicts
- ✅ You control the generator configuration

## Installation

```bash
# Using npm
npm install @gideon-defender/db @prisma/client
npm install -D prisma

# Using yarn
yarn add @gideon-defender/db @prisma/client
yarn add -D prisma
```

## Setup

After installation, copy the schema file to your project and generate the Prisma client:

```bash
# Copy the schema file
cp node_modules/@gideon-defender/db/dist/schema.prisma prisma/schema.prisma

# Add the generator block to your schema
echo "
generator client {
  provider = \"prisma-client-js\"
  output   = \"./generated\"
}" >> prisma/schema.prisma

# Generate the Prisma client
npx prisma generate
```

Or create a setup script in your `package.json`:

```json
{
  "scripts": {
    "db:setup": "cp node_modules/@gideon-defender/db/dist/schema.prisma prisma/schema.prisma && echo '\ngenerator client {\n  provider = \"prisma-client-js\"\n  output   = \"./generated\"\n}' >> prisma/schema.prisma && prisma generate",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

## Creating Your Database Client

Create a database client in your project:

```typescript
// lib/db.ts (or wherever you prefer)
import { PrismaClient } from '../prisma/generated';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

## Git Configuration

The Prisma client is generated to `src/db/generated/` and is automatically added to your `.gitignore`:

```
# Generated Prisma Client
src/db/generated/
```

> **💡 Note**: The file structure and setup is identical for both standalone and monorepo installations. The only difference is the schema source (combined schema from npm package vs. individual schema files from workspace) during the initial setup process.

⚠️ **Important**: Never commit the generated Prisma client - it's generated fresh on each install and build.

## Environment Setup

Create a `.env` file in your project root:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database"
```

## Usage

Import and use the database client in your application:

```typescript
// Import the database client
import { db } from '@gideon-defender/db';

// Import types  
import type { User, Organization, Departments } from '@gideon-defender/db/types';

// Query examples
const users = await db.user.findMany();
const organizations = await db.organization.findMany();
```

## Available Models

This package includes schemas for:

- 👤 **Authentication**: Users, Sessions, Accounts, Members
- 🏢 **Organizations**: Organizations, Invitations, Onboarding
- 📋 **Policies**: Policies, Policy Templates, Departments
- 🎯 **Tasks**: Tasks, Task Templates, Task Status
- 🔒 **Controls**: Controls, Framework Requirements
- 📊 **Risks**: Risk Management, Risk Categories
- 🏭 **Vendors**: Vendor Management, Contacts
- 🔧 **Integrations**: Third-party Integrations, Results
- 💬 **Comments**: Comments, Attachments
- 🔑 **API Keys**: API Key Management
- 📝 **Audit Logs**: Activity Tracking

## Commands

```bash
# Generate Prisma client (if needed)
npx prisma generate --schema=src/db/schema.prisma

# View database in Prisma Studio
npx prisma studio --schema=src/db/schema.prisma

# Reset database (careful!)
npx prisma migrate reset --schema=src/db/schema.prisma

# Push schema changes (development)
npx prisma db push --schema=src/db/schema.prisma
```

## TypeScript Integration

All types are automatically generated and available:

```typescript
import type {
  User,
  Organization,
  Policy,
  Risk,
  Task,
  Departments,
  RiskStatus,
  PolicyStatus,
} from '@/db/types';
```

## Troubleshooting

### Schema not found

If the schema wasn't copied automatically, run:

```bash
npx @gideon-defender/db postinstall
```

### Client generation fails

```bash
# Manually generate the client
npx prisma generate --schema=src/db/schema.prisma
```

### Generated files appearing in git

If you see generated Prisma files in your git status, add this to your `.gitignore`:

```gitignore
# Generated Prisma Client
src/db/generated/
```

Then clean up any tracked files:

```bash
git rm -r --cached src/db/generated/
git commit -m "Remove generated Prisma files from tracking"
```

### Database connection issues

1. Verify your `DATABASE_URL` in `.env`
2. Ensure your database is running
3. Check network connectivity

## Framework Compatibility

This package works with:

- ✅ Next.js (App Router & Pages Router)
- ✅ Remix
- ✅ Express.js
- ✅ Fastify
- ✅ Any Node.js framework

## Production Deployment

The postinstall script automatically runs during deployment on:

- ✅ Vercel (Node.js runtime)
- ✅ Railway (Docker containers)
- ✅ Render (Native Linux)
- ✅ AWS Lambda (Amazon Linux)
- ✅ Google Cloud Functions (Ubuntu-based)
- ✅ Docker (Debian/Alpine support)

**Cross-Platform Compatibility:**
The included binary targets ensure your app works across different deployment environments without additional configuration. The Prisma client will automatically select the correct binary for each platform.

For other platforms, ensure the postinstall script runs during your build process.

## Support

For issues or questions:

1. Check this integration guide
2. Verify your environment setup
3. Ensure all dependencies are installed
4. Check the Prisma documentation

## Schema Updates

When the `@gideon-defender/db` package is updated with new schema changes:

1. Update the package: `npm update @gideon-defender/db`
2. The postinstall script will automatically update your schema
3. Run `npx prisma generate --schema=src/db/schema.prisma` to update your client
4. Update your application code if needed
