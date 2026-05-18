#!/usr/bin/env bash
# One-command deploy for Dynamic QR Code Labs to Cloudflare.
# Run this from the repo root after `wrangler login`.

set -euo pipefail

ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-884e9f386c0ffd96278d50cbe3a8d48e}"
PAGES_PROJECT_NAME="${PAGES_PROJECT_NAME:-dynamicqrcodelabs}"
SITE_URL="${PUBLIC_SITE_URL:-https://dynamicqrcodelabs.com}"

step() { printf "\n\033[1;34m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m⚠ %s\033[0m\n" "$*"; }

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node 20+ and re-run."
  exit 1
fi

step "Authenticating with Cloudflare"
if ! npx --yes wrangler@latest whoami >/dev/null 2>&1; then
  echo "Wrangler is not authenticated. Run: npx wrangler login"
  exit 1
fi
ok "Cloudflare auth detected"

step "Installing dependencies"
npm install
ok "Dependencies installed"

step "Building marketing site (Astro)"
PUBLIC_SITE_URL="$SITE_URL" npm run build:marketing
ok "Marketing build complete"

step "Deploying marketing site to Cloudflare Pages"
npx --yes wrangler@latest pages deploy apps/marketing/dist \
  --project-name "$PAGES_PROJECT_NAME" \
  --branch main \
  --commit-dirty=true
ok "Pages deployed"

step "Setting Worker secrets (if not already set)"
cd apps/api
if ! npx --yes wrangler@latest secret list 2>/dev/null | grep -q "JWT_SECRET"; then
  echo "Generating JWT_SECRET..."
  openssl rand -base64 48 | tr -d '\n' | npx --yes wrangler@latest secret put JWT_SECRET
fi
if ! npx --yes wrangler@latest secret list 2>/dev/null | grep -q "IP_HASH_SALT"; then
  echo "Generating IP_HASH_SALT..."
  openssl rand -base64 32 | tr -d '\n' | npx --yes wrangler@latest secret put IP_HASH_SALT
fi
ok "Secrets configured"

step "Deploying Worker (API + redirect engine)"
npx --yes wrangler@latest deploy
ok "Worker deployed"

cd ../..

printf "\n\033[1;32m🎉 Deployment complete!\033[0m\n\n"
echo "Marketing site:  https://${PAGES_PROJECT_NAME}.pages.dev"
echo "Worker API:      https://dynamicqr-api.${ACCOUNT_ID:0:8}.workers.dev"
echo ""
echo "Next steps:"
echo "  1. Add your custom domain ${SITE_URL#https://} to the Pages project"
echo "  2. Add a Worker route: ${SITE_URL#https://}/q/* and ${SITE_URL#https://}/api/* → dynamicqr-api"
echo "  3. Update apps/marketing/src/lib/site.ts if you change the domain"
