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

## Advanced custom domain configurations

Beyond basic setup, several advanced configurations are useful for sophisticated programs.

**Multiple short domains on one workspace.** Some brands use different short domains for different contexts: `qr.brand.com` for general use, `try.brand.com` for trial signup QRs, `menu.brand.com` for restaurant QRs. Each domain serves a different intent and the URL itself signals what the user will find. Most modern QR platforms support multiple custom domains per workspace at the Pro or Agency tier.

**Geographic short domains.** Global brands sometimes use country-specific TLDs as short domain hosts: `qr.brand.co.uk`, `qr.brand.de`, `qr.brand.jp`. This signals geographic relevance to scanners and supports country-specific QR routing. The downside is operational complexity (more DNS to manage, more SSL certs to monitor).

**Sub-brand short domains.** Companies with multiple sub-brands can give each its own short domain: `qr.subbrand1.com`, `qr.subbrand2.com`. Useful when sub-brands have distinct identities and the QR experience should match.

**Reserved-keyword short domains.** Some brands reserve specific short codes for high-value campaigns. For example, `qr.brand.com/sale` always points to the current sale (the destination URL changes seasonally). Users who remember the URL can navigate directly without scanning.

**Vanity short URLs.** For specific high-profile campaigns, set the short code to a meaningful word rather than a random string. `qr.brand.com/launch2026` is more memorable than `qr.brand.com/x7g9k2p`. Most platforms support custom slugs on Pro and above.

**Branded link previews.** Modern browsers show URL previews when users hover over links. A branded short URL with a recognizable preview reinforces trust. Configure your platform to send appropriate Open Graph metadata for short URL previews.

These advanced configurations require ongoing management overhead. Most brands don't need all of them — pick the ones that align with how your audience engages with your QR codes.

## Migrating from a third-party short domain

Brands that started with the platform's default short domain often want to migrate to a custom domain after their program grows. The migration is straightforward but requires planning.

**Step 1: Audit existing QRs.** Document every active QR using the platform's default domain. Note which are in active production (printed and deployed) vs digital-only.

**Step 2: Plan the migration window.** Decide whether to migrate all QRs at once or in batches. All-at-once is cleaner but riskier; batches are safer but extend the migration period.

**Step 3: Set up the custom domain.** Follow the standard setup process (CNAME, SSL provisioning, platform verification). Confirm the custom domain works with a test QR before migrating production QRs.

**Step 4: Migrate digital QRs first.** These are easy to reissue. Generate new QRs with the custom domain and replace the digital deployments. Retire the old QRs.

**Step 5: Address printed QRs.** Printed QRs cannot be migrated without reprinting. Decision points: (a) accept that printed QRs continue using the old domain forever, with the platform maintaining redirect support indefinitely, (b) reprint the assets, accepting the cost, (c) some platforms support legacy domain "pointers" that forward old short URLs to new ones — verify this option with your platform.

**Step 6: Update internal documentation.** Marketing materials, brand guidelines, and team playbooks should reference the new custom domain going forward.

**Step 7: Monitor analytics across both domains.** During the transition period, monitor scan volume on both the old and new domains. Old-domain scans should decline as printed assets are replaced or fade out of active use.

Most platforms commit to maintaining legacy short URLs indefinitely as long as the account remains active. Confirm this policy with your platform before depending on it.

## Custom domain troubleshooting

When custom domains don't work as expected, the issues typically fall into a few categories.

**DNS not propagated.** After adding the CNAME record, DNS propagation typically takes 5–30 minutes but can take up to 48 hours in unusual cases. Use a DNS lookup tool (dig, nslookup, or online DNS checker) to verify the CNAME is resolving to the expected target before troubleshooting other layers.

**SSL certificate not provisioned.** Modern platforms provision SSL automatically via Let's Encrypt or similar. If SSL hasn't appeared 30 minutes after DNS verification, contact platform support. Browsers showing "Connection not secure" usually mean SSL hasn't provisioned yet.

**Mixed-content warnings.** If your destination landing page loads HTTP resources (images, scripts, fonts) while the QR redirect uses HTTPS, browsers may show mixed-content warnings. Audit your landing page to ensure all resources load over HTTPS.

**Caching issues.** Sometimes browser or CDN caches retain old DNS records or redirect responses. Clear browser cache, try incognito mode, or use a different network to verify behavior.

**Cloudflare-specific configuration.** If your DNS is on Cloudflare and you have proxying enabled (orange cloud icon), some platforms require gray cloud (DNS-only) during verification. Toggle if you encounter issues.

**Subdomain takeover risk.** When you create a CNAME pointing to a third-party service, then later cancel that service, the abandoned CNAME becomes a takeover risk if anyone else can claim the target. Audit and clean up unused custom domain CNAMEs periodically.

**Conflict with existing records.** If your subdomain already has A, AAAA, or other records, the new CNAME may conflict. CNAMEs can't coexist with most other record types. Remove conflicting records before adding the CNAME.

**Wildcard certificate edge cases.** Some platforms use wildcard certificates that cover specific subdomains. Verify your subdomain is covered by the platform's certificate policy.

**Country-specific TLD issues.** Some country-code TLDs have unusual DNS requirements. Verify with both the registrar and the QR platform that your TLD is supported.

Most issues resolve within hours of DNS propagation. Persistent issues indicate either platform configuration problems (contact support) or DNS provider quirks (check provider docs).

## Enterprise considerations

For larger brands with security and compliance requirements, custom domain setups have additional considerations.

**Certificate authority preference.** Some enterprises prefer specific certificate authorities (e.g., DigiCert, GlobalSign) over the platform's default. Verify with your platform whether you can bring your own certificate or pin specific CAs.

**Internal IT review.** Adding CNAMEs touches DNS infrastructure that typically requires internal approval. Plan time for IT review processes — often 1–2 weeks at large organizations.

**Network security implications.** Custom domains route QR scan traffic through the QR platform's infrastructure. Security teams may require vendor risk assessments before approval. Have your platform's SOC 2 reports and security documentation ready.

**DNSSEC.** If your domain uses DNSSEC for DNS integrity, verify that the custom domain CNAME setup works with your DNSSEC configuration. Some platforms have specific guidance for DNSSEC environments.

**Internal monitoring.** Enterprise IT often monitors all DNS entries for the company's domains. Add the new CNAME to monitoring with appropriate alerting if it changes unexpectedly.

**Compliance documentation.** For regulated industries (financial services, healthcare), the custom domain becomes part of compliance documentation. Document the purpose, ownership, and data flows associated with the custom domain.

**Disaster recovery.** Plan for what happens if the QR platform becomes unavailable. Some enterprises maintain backup DNS configurations that can be activated in disaster scenarios. Most don't, but it's worth considering for mission-critical QR programs.

**Vendor relationship management.** Custom domain setup creates ongoing operational dependency on the QR platform. Treat this as a vendor relationship with appropriate contracts, SLAs, and exit planning.

For most mid-market brands, these enterprise considerations are overkill. For Fortune 500 and regulated industries, they're standard practice.

## Custom domain ROI calculation

Quantifying the ROI of custom domains helps justify the cost to budget owners. The simple model: custom domains improve scan completion rates by 15–25% on average (from improved user trust). For a QR program generating, say, 10,000 scans per month at a conversion-to-revenue value of $5 per scan, the custom domain captures 1,500–2,500 additional scans per month that would otherwise have backed out. That's $7,500–$12,500 per month in additional attributable revenue, against the marginal cost of the Pro plan upgrade ($27 vs Starter, or $90 vs Free) plus zero ongoing DNS cost. The payback period is typically days, not weeks. For brands with much higher QR volume or higher scan-to-revenue ratios, the ROI multiplies accordingly.

## Conclusion

Custom domains are one of the highest-leverage upgrades available to dynamic QR programs. The setup is straightforward (one CNAME record), the cost is minimal (often included in plan upgrades), and the trust impact is measurable (15–25% scan completion lift).

If you have a Pro or Agency plan on any modern QR platform, set up a custom domain this week. The improvement in scan rates and brand consistency is worth the 15-minute setup investment.

[Set up a custom domain on a Pro plan](/pricing/) or start free and upgrade when you outgrow the free tier.

## Related reading

- [The complete guide to dynamic QR codes for marketers](/blog/complete-guide-dynamic-qr-codes-marketers/)
- [Dynamic QR code security: risks, best practices, compliance](/blog/dynamic-qr-code-security/)
- [How to use dynamic QR codes for print marketing](/blog/dynamic-qr-codes-print-marketing/)
- [Dynamic QR code analytics: metrics that matter](/blog/qr-code-analytics-guide/)
