#!/bin/sh
# Run inside the api container to patch missing-env throws and DB SSL behavior
set -e

# Upgrade hardcoded Claude model references to claude-opus-4-7 (highest available)
for f in $(grep -rlE "claude-(sonnet|opus)-4-[0-9]" /app/dist 2>/dev/null); do
  sed -i 's|claude-sonnet-4-6|claude-opus-4-7|g; s|claude-opus-4-6|claude-opus-4-7|g; s|claude-opus-4-5|claude-opus-4-7|g; s|claude-sonnet-4-5|claude-opus-4-7|g' "$f"
done
echo "[patched] Anthropic model references upgraded to claude-opus-4-7"

# Defang the MACED pentest startup throw
sed -i "s|throw new Error('MACED_API_KEY is required to start the pentest module');|console.warn('[patched] MACED_API_KEY missing — pentest module disabled'); this.macedClient = null; return;|" \
  /app/dist/src/security-penetration-tests/security-penetration-tests.service.js

# packages/db/dist/client.js gets fully replaced below

# Replace the api-local Prisma client with one that uses PrismaPg adapter and no SSL
for TARGET in /app/prisma/client.js /app/dist/prisma/client.js; do
  cat > "$TARGET" <<'JSEOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const globalForPrisma = global;
function makeClient() {
  const raw = process.env.DATABASE_URL || "";
  const url = raw.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/([?&])ssl=[^&]*/g, "$1").replace(/[?&]$/, "");
  const pool = new pg_1.Pool({ connectionString: url, ssl: false });
  const adapter = new adapter_pg_1.PrismaPg(pool);
  return new client_1.PrismaClient({ adapter, transactionOptions: { timeout: 60000 } });
}
exports.db = globalForPrisma.prisma || makeClient();
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.db;
JSEOF
  echo "[patched] $TARGET rewritten with explicit pg.Pool (ssl: false)"
done

# Also patch packages/db/dist/client.js the same way
cat > /app/packages/db/dist/client.js <<'JSEOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const globalForPrisma = global;
function makeClient() {
  const raw = process.env.DATABASE_URL || "";
  const url = raw.replace(/([?&])sslmode=[^&]*/g, "$1").replace(/([?&])ssl=[^&]*/g, "$1").replace(/[?&]$/, "");
  const pool = new pg_1.Pool({ connectionString: url, ssl: false });
  const adapter = new adapter_pg_1.PrismaPg(pool);
  return new client_1.PrismaClient({ adapter, transactionOptions: { timeout: 60000 } });
}
exports.db = globalForPrisma.prisma || makeClient();
if (process.env.NODE_ENV !== "production")
    globalForPrisma.prisma = exports.db;
JSEOF
echo "[patched] /app/packages/db/dist/client.js rewritten with explicit pg.Pool (ssl: false)"

# Stub email sender — log magic link / OTP to console instead of Resend
node <<'NODE_EOF'
const fs = require('fs');
const f = '/app/dist/src/auth/auth.server.js';
let s = fs.readFileSync(f, 'utf8');
// getCustomDomains — replace with no-op (no Redis dependency). Use function
// boundaries rather than a bare closing brace so nested object literals don't
// leave trailing syntax behind in the compiled JS.
s = s.replace(
  /async function getCustomDomains\(\) \{[\s\S]*?\nasync function isTrustedOrigin/,
  'async function getCustomDomains() { return new Set(); }\nasync function isTrustedOrigin'
);
// isTrustedOrigin — always true (single-host self-host, no strict CORS)
s = s.replace(
  /async function isTrustedOrigin\(origin\) \{[\s\S]*?\nconst socialProviders =/,
  'async function isTrustedOrigin(origin) { return true; }\nconst socialProviders ='
);
// sendMagicLink — wrap the entire body so we never call triggerEmail
s = s.replace(
  /sendMagicLink: async \(\{ email, url \}\) => \{[\s\S]*?await \(0, trigger_email_1\.triggerEmail\)\(\{[\s\S]*?\}\);\s*\}/,
  `sendMagicLink: async ({ email, url }) => {
                console.log('========================================');
                console.log('[MAGIC LINK] for ' + email);
                console.log('  ' + url);
                console.log('========================================');
                return;
            }`
);
// sendVerificationOTP — same treatment
s = s.replace(
  /async sendVerificationOTP\(\{ email, otp \}\) \{[\s\S]*?await \(0, trigger_email_1\.triggerEmail\)\(\{[\s\S]*?\}\);\s*\}/,
  `async sendVerificationOTP({ email, otp }) {
                console.log('========================================');
                console.log('[OTP] for ' + email + ': ' + otp);
                console.log('========================================');
                return;
            }`
);
fs.writeFileSync(f, s);
console.log('[patched] /app/dist/src/auth/auth.server.js: email sends stubbed (logged to stdout)');

// Loosen helmet so the browser-side app (port 3000) can call this api (port 3333)
const m = '/app/dist/src/main.js';
let main = fs.readFileSync(m, 'utf8');
main = main.replace(
  /crossOriginEmbedderPolicy: false,/,
  'crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: { policy: "cross-origin" }, crossOriginOpenerPolicy: false,'
);
fs.writeFileSync(m, main);
console.log('[patched] /app/dist/src/main.js: helmet CORP=cross-origin, COOP=off');
NODE_EOF

chown -R nestjs:nestjs /app/dist /app/packages/db/dist /app/prisma
exec su -s /bin/sh nestjs -c 'node --report-on-fatalerror --report-compact dist/src/main.js'
