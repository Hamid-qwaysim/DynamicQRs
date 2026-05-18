# Dynamic QR Code Labs — `dynamicqrcodelabs.com`

A production-ready, SEO-optimized dynamic QR code SaaS platform.

**Target keywords:** `dynamic QR code`, `free dynamic QR code`, `dynamic QR code generator`.

## Architecture

This is a monorepo with three workspaces:

```
dynamicqrcodelabs/
├── apps/
│   ├── marketing/   ← Astro 5 SSG site (homepage, pricing, blog, articles)
│   ├── api/         ← Cloudflare Workers + D1 + Drizzle ORM (auth, QR, redirect engine, analytics)
│   └── app/         ← React + Vite dashboard (scaffold ready)
└── packages/        ← Shared utilities (planned)
```

### Why hybrid Astro + Workers

- **Marketing site (Astro):** SSG output, Lighthouse 95+, deep SEO content for ranking on Google.
- **Redirect engine + API (Workers):** Edge-located, 30-60 ms global redirects, D1 for persistent storage.
- **Dashboard (React, planned):** Interactive QR designer and analytics.

## SEO foundation

- Site URL configured via `PUBLIC_SITE_URL` env var (default `https://dynamicqrcodelabs.com`)
- `<html lang="en" dir="ltr">` on every page
- One H1 per page, semantic H2/H3 hierarchy
- Meta descriptions 140-160 chars enforced at content-collection layer
- Open Graph + Twitter Card meta on every page
- JSON-LD schemas: Organization, WebSite, SoftwareApplication, BlogPosting, FAQPage, BreadcrumbList
- `sitemap-index.xml` auto-generated via `@astrojs/sitemap`
- `robots.txt` with correct sitemap directive
- RSS feed at `/rss.xml`
- Self-hosted Inter variable font (no Google Fonts)
- Critical CSS inlined; rest loaded non-blocking
- `prefetch: false` to avoid `page.js` in the critical chain

## Marketing content (current pages)

| Page | URL | Words | Target keyword |
|------|-----|-------|----------------|
| Homepage | `/` | ~3500 | dynamic QR code, free dynamic QR code |
| QR Generator | `/qr-code-generator/` | ~600 | free dynamic QR code generator |
| Features | `/features/` | ~1000 | dynamic QR features |
| Use Cases | `/use-cases/` | ~1000 | dynamic QR use cases |
| Pricing | `/pricing/` | ~600 | dynamic QR pricing |
| About | `/about/` | ~600 | brand |

| Blog article | URL | Words | Target |
|--------------|-----|-------|--------|
| What is a Dynamic QR Code | `/blog/what-is-a-dynamic-qr-code/` | ~2800 | what is dynamic QR code |
| Dynamic vs Static QR Code | `/blog/dynamic-vs-static-qr-code/` | ~2200 | dynamic vs static QR |
| Best Dynamic QR Generators 2026 | `/blog/best-dynamic-qr-code-generators-2026/` | ~2100 | best dynamic QR generator |
| QR Code Analytics Guide | `/blog/qr-code-analytics-guide/` | ~2300 | QR analytics |
| Dynamic QR for Restaurant Menu | `/blog/dynamic-qr-restaurant-menu/` | ~2200 | dynamic QR restaurant |
| How to Create a Dynamic QR Code | `/blog/how-to-create-dynamic-qr-code/` | ~2100 | how to create dynamic QR |
| Free Dynamic QR Code Generator | `/blog/free-dynamic-qr-code-generator/` | ~1800 | free dynamic QR code |

## Local development

```bash
# Install everything
npm install

# Marketing site (Astro)
npm run dev:marketing          # http://localhost:4321
npm run build:marketing
npm run preview:marketing

# API (Cloudflare Workers)
cd apps/api
npx wrangler d1 create dynamicqr-db
# Copy the database_id into wrangler.toml
npx wrangler d1 execute dynamicqr-db --local --file=./drizzle/0001_initial.sql
npx wrangler dev               # http://localhost:8787
```

## Production deployment

### Marketing site (Cloudflare Pages)

```bash
# Build
PUBLIC_SITE_URL=https://dynamicqrcodelabs.com npm run build:marketing

# Deploy
npx wrangler pages deploy apps/marketing/dist --project-name dynamicqrcodelabs
```

### API (Cloudflare Workers + D1)

```bash
cd apps/api
# Create production D1 database
npx wrangler d1 create dynamicqr-db
# Copy `database_id` from the output into wrangler.toml

# Apply migrations
npx wrangler d1 execute dynamicqr-db --remote --file=./drizzle/0001_initial.sql

# Set secrets
echo "PUT_A_LONG_RANDOM_STRING_HERE" | npx wrangler secret put JWT_SECRET
echo "PUT_A_DIFFERENT_LONG_RANDOM_STRING_HERE" | npx wrangler secret put IP_HASH_SALT

# Deploy
npx wrangler deploy
```

### Custom domain wiring

Point `dynamicqrcodelabs.com` to your Cloudflare Pages project (for the marketing site).

For the redirect engine (`/q/*`), you can either:
- **Option A:** Host the Worker on a subdomain like `r.dynamicqrcodelabs.com` and have your QR codes encode `r.dynamicqrcodelabs.com/q/<code>`.
- **Option B (recommended):** Route `dynamicqrcodelabs.com/q/*` and `dynamicqrcodelabs.com/api/*` to the Worker via Cloudflare routes, so the redirect feels seamless under the main domain.

## SEO acceptance checklist

- [x] sitemap.xml exists and is valid (`sitemap-index.xml`)
- [x] robots.txt with `Sitemap:` directive
- [x] All meta descriptions 140-160 chars (enforced by content-collection schema)
- [x] Every page has unique title and description
- [x] `<html lang="en" dir="ltr">` correct
- [x] One H1 per page
- [x] Semantic H2 / H3 hierarchy
- [x] JSON-LD: Organization, WebSite, SoftwareApplication, BlogPosting, FAQPage, BreadcrumbList
- [x] Open Graph + Twitter Card meta
- [x] RSS feed at `/rss.xml`
- [x] Self-hosted fonts (no external CDN)
- [x] Critical CSS inline, global CSS non-blocking
- [x] No render-blocking external resources
- [x] Mobile responsive (viewport meta, fluid layout)
- [x] Internal linking silo (articles → homepage + 3 related)

## API surface (current)

```
POST   /api/auth/signup            Create account + default workspace
POST   /api/auth/login             Authenticate
POST   /api/auth/logout            Destroy session
GET    /api/auth/me                Current user

GET    /api/qr-codes               List QRs in default workspace
POST   /api/qr-codes               Create dynamic QR
GET    /api/qr-codes/:id           Get QR detail
PATCH  /api/qr-codes/:id           Update destination/design/rules (creates version)
POST   /api/qr-codes/:id/pause     Pause
POST   /api/qr-codes/:id/resume    Resume
POST   /api/qr-codes/:id/revoke    Revoke (admin/owner)
DELETE /api/qr-codes/:id           Soft delete (admin/owner)
GET    /api/qr-codes/:id/analytics Per-QR stats

GET    /q/:shortCode               Public redirect engine (logs scan, applies smart redirects)

GET    /healthz                    Health check
```

## What's next (post-launch)

Phase 2:
- Dashboard UI (React + Vite, scaffold in `apps/app/`)
- QR SVG renderer with design studio
- Bulk CSV upload
- Smart redirect rule builder UI

Phase 3:
- Custom domains
- Public REST API + API keys
- Landing page builder
- Restaurant menu module

Phase 4:
- Admin panel
- Billing (Stripe)
- Email notifications
- White-label reports

## License

Proprietary. © 2026 Dynamic QR Code Labs.
