#!/usr/bin/env bash
#
# setup-comp.sh — bootstrap a local Comp AI dev environment on macOS.
#
# Usage:
#   chmod +x setup-comp.sh
#   ./setup-comp.sh [path-to-repo]
#
# Defaults to /Users/chris/Code/comp. Safe to re-run; it won't clobber
# .env files that already exist.

set -euo pipefail

REPO="${1:-/Users/chris/Code/comp}"

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------
bold "1. Checking prerequisites"

command -v node   >/dev/null || die "node not found. Install with: brew install node"
command -v bun    >/dev/null || die "bun not found.  Install with: brew install oven-sh/bun/bun"
command -v docker >/dev/null || die "docker not found. Install Docker Desktop."
command -v git    >/dev/null || die "git not found."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || die "Node >=20 required, found $(node -v)"
ok "node $(node -v)"

# Bun >= 1.1.36
BUN_VER="$(bun --version)"
if [ "$(printf '%s\n1.1.36\n' "$BUN_VER" | sort -V | head -1)" != "1.1.36" ]; then
  die "Bun >=1.1.36 required, found $BUN_VER"
fi
ok "bun $BUN_VER"

docker info >/dev/null 2>&1 || die "Docker daemon isn't running. Start Docker Desktop and re-run."
ok "docker running"

[ -d "$REPO" ] || die "Repo not found at $REPO"
[ -f "$REPO/package.json" ] || die "$REPO doesn't look like the comp repo (no package.json)"
cd "$REPO"
ok "repo at $REPO"

bold ""
bold "   Current checkout"
echo "   branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
echo "   commit: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"
echo "   latest tag: $(git describe --tags --abbrev=0 2>/dev/null || echo 'none fetched')"
warn "Issue #3331 reports apps/api failing to start from a fresh checkout of main."
warn "If you hit a HybridAuthGuard DI error, try a release tag instead:"
warn "  git fetch --tags && git checkout \$(git describe --tags --abbrev=0)"

# ---------------------------------------------------------------
bold ""
bold "2. Installing dependencies"

bun install
ok "bun install"

bun add -d concurrently >/dev/null 2>&1 && ok "concurrently" || warn "concurrently install skipped"

if ! command -v turbo >/dev/null 2>&1; then
  bun add -g turbo && ok "turbo (global)"
else
  ok "turbo already installed"
fi

# ---------------------------------------------------------------
bold ""
bold "3. Scaffolding .env files"

# The repo ships .env.example files; copy each one next to itself as .env
# rather than guessing at variable names.
MADE=0
while IFS= read -r example; do
  target="${example%.example}"
  rel="${example#$REPO/}"
  if [ -f "$target" ]; then
    warn "$(dirname "$rel")/.env already exists — leaving it alone"
  else
    cp "$example" "$target"
    ok "created ${target#$REPO/} from $rel"
    MADE=$((MADE+1))
  fi
done < <(find "$REPO" -name '.env.example' -not -path '*/node_modules/*' | sort)

if [ "$MADE" -eq 0 ] && ! find "$REPO" -name '.env.example' -not -path '*/node_modules/*' | grep -q .; then
  warn "No .env.example files found. Check the repo docs for the expected env layout."
fi

# ---------------------------------------------------------------
bold ""
bold "4. Generating secrets"

# Fill any empty secret-ish vars with a generated value, in place.
fill_secret() {
  local file="$1" key="$2"
  [ -f "$file" ] || return 0
  # only fill if the key exists and its value is empty or a placeholder
  if grep -qE "^${key}=(\"\")?(''),?$|^${key}=$|^${key}=\"\"$|^${key}=<" "$file" 2>/dev/null; then
    local val
    val="$(openssl rand -base64 32)"
    # macOS sed needs the empty -i argument
    sed -i '' "s|^${key}=.*|${key}=\"${val}\"|" "$file"
    ok "$key set in ${file#$REPO/}"
  fi
}

for f in "$REPO/apps/app/.env" "$REPO/apps/portal/.env" "$REPO/packages/db/.env"; do
  for key in AUTH_SECRET SECRET_KEY BETTER_AUTH_SECRET REVALIDATION_SECRET; do
    fill_secret "$f" "$key"
  done
done

# ---------------------------------------------------------------
bold ""
bold "5. Starting Postgres"

if bun run --silent docker:up 2>/dev/null || bun docker:up; then
  ok "postgres container up (db: comp, user/pass: postgres/postgres)"
else
  warn "bun docker:up failed — check package.json for the right script name"
fi

# ---------------------------------------------------------------
bold ""
bold "6. What's left for you"
cat <<'EOF'

  These need real credentials before the app will fully work. Open the
  .env files created above and fill in:

    GOOGLE_ID / GOOGLE_SECRET
      https://console.cloud.google.com → APIs & Services → Credentials
      Create an OAuth 2.0 Client (Web application) with these redirect URIs:
        http://localhost:3000/api/auth/callback/google
        http://localhost:3002/api/auth/callback/google
      and these authorized origins:
        http://localhost:3000
        http://localhost:3002

    UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
      https://console.upstash.com → create a Redis database (free tier is fine)

    RESEND_API_KEY        (transactional email — optional locally)
    TRIGGER_SECRET_KEY    (background workflows — optional locally)

  Then run migrations and start the stack:

    bun run db:migrate      # or: bunx prisma migrate deploy --schema packages/db/prisma
    bun run dev

  App:    http://localhost:3000
  Portal: http://localhost:3002

  Note: NEXT_PUBLIC_* vars are baked in at build time. If you change one,
  rebuild — restarting alone won't pick it up.

EOF

bold "Done."
