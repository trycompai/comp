#!/bin/bash
# Run seeder against a running compose stack.
#
# The default `docker compose run --rm seeder` fails because:
# - The migrator-stage image runs `bunx prisma generate --schema=node_modules/@trycompai/db/dist/schema.prisma`
# - Generator output goes to /app/node_modules/@trycompai/db/node_modules/.prisma/client
# - But the seeder's `import { PrismaClient } from '@prisma/client'` resolves from
#   /app/node_modules/@prisma/client, which is the unfilled stub
#
# Fix: copy the nested generated client over the outer stub before running seed.
# Seeder loads ~17 frameworks (SOC 2, ISO 27001, HIPAA, GDPR, NIST, PCI...) +
# 50 control templates + 37 policy templates + 74 task templates + 980 requirements.

set -e

cd "$(dirname "$0")/.."

echo "==> running migrator (idempotent)"
docker compose run --rm migrator

echo "==> running seeder with prisma-client path patch"
docker compose run --rm --entrypoint /bin/sh seeder -c '
  bunx prisma generate --schema=node_modules/@trycompai/db/dist/schema.prisma 2>&1 | tail -3
  cp -r node_modules/@trycompai/db/node_modules/.prisma/client/* node_modules/.prisma/client/
  cp -r node_modules/@trycompai/db/node_modules/@prisma/client/* node_modules/@prisma/client/ 2>/dev/null || true
  bun packages/db/prisma/seed/seed.js
'

echo "==> verify seeded data"
docker compose exec -T db psql -U comp -d comp -c "
SELECT 'frameworks' AS t, COUNT(*) FROM \"FrameworkEditorFramework\" UNION ALL
SELECT 'requirement_templates', COUNT(*) FROM \"FrameworkEditorRequirement\" UNION ALL
SELECT 'control_templates', COUNT(*) FROM \"FrameworkEditorControlTemplate\" UNION ALL
SELECT 'policy_templates', COUNT(*) FROM \"FrameworkEditorPolicyTemplate\" UNION ALL
SELECT 'task_templates', COUNT(*) FROM \"FrameworkEditorTaskTemplate\";"
