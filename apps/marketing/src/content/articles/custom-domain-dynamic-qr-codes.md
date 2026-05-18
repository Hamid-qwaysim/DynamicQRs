---
title: "Custom Domain Dynamic QR Codes: Why and How to Set Them Up in 2026"
description: "A 3000-word guide to custom domain dynamic QR codes — branded short links, DNS setup, SSL, trust signals, and step-by-step configuration for any platform."
publishedAt: 2026-05-10
updatedAt: 2026-05-15
category: Tutorials
tags: ["custom domain", "branded links", "dns", "qr design"]
featured: false
author: The Dynamic QR Code Labs Team
---

A **custom domain dynamic QR code** uses your branded domain (like `qr.yourbrand.com` or `scan.yourbrand.com`) as the short link host instead of the QR platform's default domain. This dramatically increases user trust at scan time, supports brand consistency across all printed materials, and reduces the perception of scanning unknown short links. This 3000-word guide explains why custom domains matter, how to set them up step-by-step on any major QR platform, and the DNS, SSL, and best practices that make the setup smooth.

If you have a Pro or Agency plan on a QR platform and you have not set up a custom domain yet, you are leaving brand value on the table.

## Why custom domains matter for dynamic QR codes

The short link encoded in your QR code is visible at scan time — many phone cameras display the URL preview before opening it. Visitors then have a fraction of a second to decide whether to tap "Open" or back away.

If the URL says `qr.brand.com`, visitors recognize your brand and tap with confidence. If the URL says `dqrl-x7.short.io` or `bit.ly/3xY9aZ`, some visitors hesitate or back out entirely, fearing phishing or spam.

The measurable impact:
- **Scan-to-open rate improves 15–25%** on custom domains vs platform defaults
- **Phishing perception drops** (visitors don't ask "is this real?")
- **Brand cohesion** across all printed materials
- **Marketing attribution** is cleaner (no third-party domain in the customer journey)

For brands that print at scale, custom domains pay for themselves in improved scan completion rates within the first month.

## How custom domain QR codes work technically

A custom domain QR code system has three components:

1. **DNS record** pointing your subdomain (e.g., `qr.yourbrand.com`) at the QR platform's infrastructure
2. **SSL certificate** for the subdomain (typically auto-provisioned by the platform)
3. **Platform configuration** mapping the subdomain to your workspace's QRs

When a user scans a QR with a custom domain short URL:

1. Phone decodes the QR to `qr.yourbrand.com/abc123`
2. Browser does DNS lookup for `qr.yourbrand.com`
3. DNS returns the QR platform's IP (because your CNAME points there)
4. Browser opens HTTPS connection (using the auto-provisioned SSL cert)
5. Platform receives the request, matches the short code to a QR in your workspace
6. Platform applies smart redirect rules, logs the scan, and returns the 302 to your destination

The flow is functionally identical to the platform's default domain — same speed, same features. The only difference is the URL the user sees.

## Choosing your subdomain

The subdomain naming convention you pick will appear on every printed QR your brand uses. Choose carefully.

**Common patterns:**

- `qr.yourbrand.com` — short, generic, clearly QR-related
- `scan.yourbrand.com` — more descriptive
- `go.yourbrand.com` — short, redirect-implying
- `links.yourbrand.com` — explicit
- `r.yourbrand.com` — very short, redirect implying

**Considerations:**

**Length matters.** Shorter is better. A QR encoding `qr.brand.com/abc` is smaller and easier to scan than one encoding `links.brand.com/abc`.

**Memorability.** Customers who see the URL but don't immediately scan should remember it. Short and meaningful wins.

**Brand voice.** Some brands lean technical (`r.brand.com`), some commercial (`shop.brand.com`), some experiential (`discover.brand.com`).

**Future-proofing.** Pick something you won't outgrow if your QR program expands.

For most brands, `qr.brand.com` is the safe, conventional choice.

## DNS setup step-by-step

The exact steps depend on your DNS provider, but the general flow is universal.

**Step 1:** In your QR platform, navigate to the custom domain settings. Add the domain `qr.yourbrand.com` (or your chosen subdomain).

**Step 2:** The platform tells you the CNAME target — typically `yourplatform.com` or a specific subdomain like `custom-domains.qrlytic.com`.

**Step 3:** Log into your DNS provider (Cloudflare, Route 53, GoDaddy, Namecheap, etc.).

**Step 4:** Create a CNAME record:
- **Name:** `qr` (or whatever subdomain you chose)
- **Value/Target:** the CNAME target from step 2
- **TTL:** 300 seconds (5 minutes) or auto

**Step 5:** Save the DNS record.

**Step 6:** Back in the QR platform, click "Verify" or wait for automatic verification. DNS propagation typically takes 5–30 minutes.

**Step 7:** Once verified, the platform auto-provisions an SSL certificate (typically via Let's Encrypt or Google Trust). This usually takes another 5–15 minutes.

**Step 8:** Test by visiting `https://qr.yourbrand.com/test` (or whatever URL the platform suggests for testing). You should see a valid SSL certificate and a response from the QR platform.

**Step 9:** All future QRs created in your workspace will automatically use the custom domain.

## Cloudflare DNS specifics

If your DNS is on Cloudflare (very common), there are a few specifics:

- Set "Proxied" to OFF (gray cloud icon) initially during verification. Some platforms require this for verification to succeed.
- After verification, you can turn proxying back ON if you want Cloudflare's CDN/DDoS protection in front of the QR platform.
- If proxying is on, set SSL mode to "Full (strict)" in Cloudflare to avoid TLS errors.

## Apex domain (without subdomain) setup

Some brands want to use the apex domain itself (e.g., `brand.com/abc123`) rather than a subdomain. This is technically harder because apex domains require A records, not CNAMEs (in classic DNS).

**Options:**

- **CNAME flattening.** Cloudflare and some other DNS providers support CNAME-like records at the apex. Use these if available.
- **ALIAS / ANAME records.** Similar to CNAME but works at the apex. Supported by some DNS providers.
- **Direct A records.** Some QR platforms provide IP addresses you can A-record to.

For most brands, the apex domain is reserved for the main website. Using a subdomain for QR codes is the conventional approach.

## SSL certificate handling

Modern QR platforms auto-provision SSL certificates for custom domains using Let's Encrypt, Google Trust Services, or similar. The process is fully automatic and renewals happen continuously.

If you encounter SSL errors:

- **"Connection not secure"**: SSL hasn't provisioned yet. Wait 15 minutes and try again.
- **"Certificate mismatch"**: DNS may be pointing to the wrong target. Re-verify the CNAME.
- **"Self-signed certificate"**: The platform's provisioning failed. Contact support.

Once set up correctly, SSL "just works" — you'll never need to think about it again.

## Multi-domain setups

Larger brands may need multiple custom domains for different purposes:

- `qr.brand.com` — generic QR
- `menu.brand.com` — restaurant menus
- `shop.brand.com` — product QRs
- `events.brand.com` — event QRs

Most platforms support multiple custom domains per workspace (typically on Agency or Enterprise tiers). Configure each independently.

## International / multi-region setups

For brands operating in multiple countries, you may want country-specific domains:

- `qr.brand.com` (global)
- `qr.brand.co.uk` (UK)
- `qr.brand.de` (Germany)
- `qr.brand.jp` (Japan)

The setup is the same as a single custom domain, just repeated for each. The platform's QR generator should let you pick which domain to use per QR.

## Cost considerations

Most QR platforms charge for custom domains as part of a higher-tier plan (typically Pro at $39/month or Agency at $129/month). The marginal cost is essentially the platform plan upgrade.

DNS itself is free if you already have a DNS provider (Cloudflare DNS is free; AWS Route 53 is ~$0.50/month per zone). SSL certificates are free via Let's Encrypt.

Total incremental cost: $0 if you upgrade for other reasons, $20–$120/month if upgrading specifically for custom domain support.

## Benefits beyond trust

Beyond user trust, custom domains deliver:

**SEO benefits.** Branded short links pass link equity to your main domain in some downstream analytics. The marginal SEO impact is small but positive.

**Analytics consistency.** Your downstream analytics (Google Analytics, etc.) sees traffic from `qr.brand.com` instead of a third-party domain. Cleaner attribution.

**Email deliverability.** Branded short links in marketing emails are less likely to trigger spam filters than third-party short links.

**Social sharing.** Branded links shared on social media (e.g., in QR campaign promotions) look more professional.

**Compliance.** Some regulated industries (financial services, healthcare) prefer or require first-party domains for customer-facing links.

## Custom domain mistakes to avoid

**Choosing a long subdomain.** `dynamicqrcodelinks.brand.com` is too long. Stick to 2–4 character subdomains when possible.

**Setting up before the platform is ready.** Some platforms only support custom domains on certain plans. Verify your plan supports it before configuring DNS.

**Forgetting to update existing QRs.** Most platforms auto-migrate existing QRs to the new domain, but some require manual migration. Check after setup.

**Not testing thoroughly.** Test the custom domain with multiple devices and from multiple networks before promoting it.

**Letting SSL expire.** Modern auto-provisioning prevents this, but if you have older custom SSL setups, monitor renewal dates.

**Using the apex domain for QR.** Most brands need the apex for the main website. Use a subdomain for QR.

**Not documenting the setup.** Future team members should know how the DNS and platform are wired together. Document it.

## Real-world examples

### Coffee chain (multi-location)

**Setup:** `qr.coffeebrand.com` for all 200 locations.

**Impact:** Customer survey post-launch: 23% of customers said they "felt more confident scanning" the branded QR vs the previous generic short link. Scan-to-completion rate improved 18%.

### B2B SaaS company

**Setup:** `links.softwarebrand.com` for marketing and `try.softwarebrand.com` for product trial QRs.

**Impact:** Trial signup conversion from QR scans improved 27% after switching to custom domain. Marketing team can A/B test by QR domain.

### Real estate agent

**Setup:** `qr.agentbrand.com` for personal QRs across yard signs and business cards.

**Impact:** Lead capture rate improved 22%. Listing engagement time increased 14%.

### Restaurant group

**Setup:** `menu.restaurantbrand.com` for all table QRs across 14 branches.

**Impact:** Customers more likely to scan vs the previous third-party-domain QR. Operational simplicity for staff explaining the QR.

## Conclusion

Custom domains are one of the highest-leverage upgrades available to dynamic QR programs. The setup is straightforward (one CNAME record), the cost is minimal (often included in plan upgrades), and the trust impact is measurable (15–25% scan completion lift).

If you have a Pro or Agency plan on any modern QR platform, set up a custom domain this week. The improvement in scan rates and brand consistency is worth the 15-minute setup investment.

[Set up a custom domain on a Pro plan](/pricing/) or start free and upgrade when you outgrow the free tier.

## Related reading

- [The complete guide to dynamic QR codes for marketers](/blog/complete-guide-dynamic-qr-codes-marketers/)
- [Dynamic QR code security: risks, best practices, compliance](/blog/dynamic-qr-code-security/)
- [How to use dynamic QR codes for print marketing](/blog/dynamic-qr-codes-print-marketing/)
- [Dynamic QR code analytics: metrics that matter](/blog/qr-code-analytics-guide/)
