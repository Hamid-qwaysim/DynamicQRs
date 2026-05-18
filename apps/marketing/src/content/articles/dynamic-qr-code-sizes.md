---
title: "Dynamic QR Code Sizes: The Definitive Print and Digital Guide"
description: "A 3000-word guide to dynamic QR code sizing — minimum print sizes, scan distance math, file formats, DPI, and tested dimensions for every placement."
publishedAt: 2026-05-08
updatedAt: 2026-05-15
category: Tutorials
tags: ["qr design", "sizing", "print"]
featured: false
author: The Dynamic QR Code Labs Team
---

**Dynamic QR code sizes** are the single most common cause of scan failures in real-world deployments. A QR that scans perfectly at 4000 pixels on a monitor may fail at 2 cm on a printed coffee cup. This 3000-word guide explains the math behind QR sizing, the minimum dimensions for every common print placement, the file formats to use, and how to test dimensions before mass production. Get the size right and 95% of scan failures disappear.

If you have ever printed QRs that wouldn't scan, the cause is almost certainly that they were too small for the scan distance.

## The basic sizing rule

The QR pattern must be large enough that the smallest module (one "pixel" of the QR) is clearly resolvable to the camera at the typical scan distance.

The simplest practical rule:

**Minimum QR side length = scan distance ÷ 10**

So:
- Scan distance 30 cm (typical phone-to-product) → QR ≥ 3 cm × 3 cm
- Scan distance 1 m (typical poster viewing) → QR ≥ 10 cm × 10 cm
- Scan distance 5 m (typical billboard at street level) → QR ≥ 50 cm × 50 cm
- Scan distance 30 m (large stadium signage) → QR ≥ 3 m × 3 m

This rule has built-in safety margin. If you can comply, scan reliability is excellent.

## Minimum sizes by placement type

Real-world tested minimums for common placements:

| Placement | Typical scan distance | Minimum QR side | Recommended QR side |
| :--- | :---: | :---: | :---: |
| Business card | 25 cm | 1.5 cm | 2 cm |
| Restaurant table sticker | 30 cm | 2.5 cm | 3 cm |
| Product packaging (small) | 30 cm | 2 cm | 2.5 cm |
| Product packaging (large) | 50 cm | 3 cm | 4 cm |
| Direct mail postcard | 30 cm | 2.5 cm | 3 cm |
| Magazine ad | 30 cm | 2.5 cm | 3 cm |
| Newspaper ad | 40 cm | 3 cm | 4 cm |
| Brochure / flyer | 40 cm | 3 cm | 4 cm |
| Indoor poster | 1 m | 8 cm | 10 cm |
| Outdoor poster | 2 m | 15 cm | 20 cm |
| Storefront window | 2 m | 15 cm | 20 cm |
| Yard sign (real estate) | 5 m | 8 cm | 10 cm |
| Billboard | 10 m | 80 cm | 1 m |
| Stadium signage | 30 m | 2.5 m | 3 m |
| Vehicle wrap | 3 m | 25 cm | 30 cm |
| Train station signage | 5 m | 40 cm | 50 cm |
| Conference booth signage | 2 m | 15 cm | 20 cm |
| Trade show banner | 3 m | 25 cm | 30 cm |
| Bus shelter ad | 2 m | 15 cm | 20 cm |
| Subway poster | 1 m | 8 cm | 10 cm |
| Restaurant menu | 30 cm | 2.5 cm | 3 cm |
| Hotel room compendium | 30 cm | 2.5 cm | 3 cm |
| WiFi password sticker | 30 cm | 2 cm | 2.5 cm |
| Event ticket | 25 cm | 2 cm | 2.5 cm |
| Conference badge | 30 cm | 2.5 cm | 3 cm |
| Boarding pass | 25 cm | 2 cm | 2.5 cm |
| Receipt | 25 cm | 1.5 cm | 2 cm |
| Loyalty card | 25 cm | 1.5 cm | 2 cm |
| Vinyl wall decal | 1 m | 8 cm | 10 cm |
| Floor decal | 1.5 m | 12 cm | 15 cm |

Use these as guidance and increase by 20–30% for outdoor or low-light conditions.

## The quiet zone

Every QR needs a "quiet zone" — a white margin around the QR pattern with no other content. The QR specification requires at least 4 modules of quiet zone on every side.

In practical terms, the quiet zone should be approximately 10% of the QR's side length on each side. For a 3 cm × 3 cm QR, that's a 3 mm margin all around. Including the quiet zone, the total footprint becomes 3.6 cm × 3.6 cm.

Do not let your designer or printer crop the quiet zone. A QR with no margin against busy artwork fails to scan even at the right size.

## File format and resolution

The file format you use to deliver the QR to the printer matters as much as the size.

**SVG (Scalable Vector Graphics).** Best for print. Scales to any size without quality loss. Always use SVG if your platform supports it.

**PDF.** Also vector-based. Good for handing off to printers who don't process SVG.

**PNG at high resolution.** Acceptable if vector isn't an option. Use at least 300 DPI at the final print size. For a 5 cm × 5 cm QR, that's 591 × 591 pixels minimum; 1000 × 1000 pixels is safer.

**JPG.** Avoid. Lossy compression introduces artifacts that reduce scan reliability.

**EPS.** Legacy vector format. Acceptable but SVG is more modern.

If your platform only exports raster (PNG/JPG), export at the highest available resolution and let the printer scale down. Never scale up — you cannot add detail that wasn't there.

## DPI and print quality

For raster QR images, DPI (dots per inch) determines print quality:

- **300 DPI:** Industry standard for print. Acceptable for most QR purposes.
- **600 DPI:** Higher quality, better for small QRs where every module matters.
- **150 DPI:** Web/screen quality. Insufficient for print.
- **72 DPI:** Screen-only. Never for print.

When in doubt, use 300 DPI as the minimum. For QRs under 2 cm, use 600 DPI.

For SVG (vector) files, DPI doesn't apply — they scale to any size at perfect quality.

## Curved and irregular surfaces

QRs on curved surfaces (bottles, jars, cans) are harder to scan than QRs on flat surfaces. Compensation strategies:

**Increase QR size by 25–50%** to give scanners more margin.

**Position on the flattest available area.** Avoid the curve apex.

**Use higher error correction (H level)** so partial distortion is recoverable.

**Test with real samples** in real handheld conditions.

Some surfaces (extremely curved bottles, fluted glass, woven fabrics) are essentially unscannable regardless of QR size. For these, consider alternative placements or accept lower scan rates.

## Multi-language and dense content

Long URLs and high data density require more modules in the QR, which means each module is smaller at a given size. This reduces scan reliability.

Dynamic QRs solve this elegantly — they encode short URLs (typically 25–30 characters) regardless of the destination URL's length. A static QR pointing to a 200-character URL might need to be 5 cm × 5 cm to scan reliably; the equivalent dynamic QR is fine at 2.5 cm × 2.5 cm.

This is one of dynamic QR codes' underappreciated advantages: they let you keep QRs small even when destinations are complex.

## Testing dimensions before mass production

The pre-production testing checklist:

1. **Print a sample at the production size.** Not a digital proof, not a scaled-up version. Actual production size on actual production substrate.

2. **Scan with multiple devices.** iOS Camera + Android Google Lens at minimum. Older Android phones too if your audience uses them.

3. **Scan from typical viewing distance.** Don't scan from 5 cm if customers will scan from 50 cm.

4. **Scan in production lighting.** Indoor fluorescent vs outdoor sun vs dim restaurant lighting all affect scannability.

5. **Scan 10+ times.** One successful scan doesn't validate the size. Consistency matters.

6. **Scan from different angles.** Customers rarely hold their phone perfectly square. Test from various angles.

7. **Scan with the QR partially obscured.** Real-world scans often involve thumbs over part of the QR. Test with this.

8. **Document the test results.** If you change anything (size, contrast, logo), retest.

## Scaling for specific scenarios

### Distance-from-eye-level placements

For QRs that scanners will approach (rather than scanning at a distance), distance from the QR varies during the scan. Test at multiple distances within the expected range.

### High-traffic placements

For placements where many people will scan in rapid succession (event entrances, restaurant counters), QR size affects throughput. Larger QRs scan faster (less time to position the phone). For high-throughput, go 25% larger than the minimum.

### Outdoor and weather-exposed

Outdoor QRs face glare, weather, and varying lighting. Increase size by 30% and use matte finish (not glossy) to handle glare.

### Low-light placements

QRs in dim environments (restaurant tables, movie theaters, nightclubs) need higher contrast and larger sizes. Increase by 40% and use the highest contrast color pair available.

### Glossy or reflective surfaces

Glossy magazines, laminated cards, polished surfaces all reflect light at angles that break scanning. Increase size by 30% and prefer matte finishes when possible.

## Sizing for digital displays

QRs on digital displays (screens, video boards, kiosks) have their own considerations:

**Screen pixels per inch.** Higher PPI screens render small QRs more cleanly. A 1080p display at 24 inches has ~92 PPI; a 4K display at the same size has ~184 PPI.

**Display brightness.** Bright displays in dark rooms work well; dim displays in bright environments don't.

**Animation and timing.** If the QR appears as part of a video, it must be visible long enough for viewers to scan (3+ seconds minimum, 5+ seconds preferred).

**Distance from screen.** Same scan-distance math applies. A QR on a TV viewed from 2 m needs to be ~20 cm on screen.

For digital displays, the recommended minimums are typically larger than print because screen rendering has more variability than print.

## Common sizing mistakes

**QR sized for monitor preview, not print size.** Always size for the actual printed dimension.

**No quiet zone in the printed file.** Designers sometimes crop the quiet zone for tighter layouts. Push back on this.

**Wrong DPI.** Raster QRs exported at 72 DPI become pixelated when printed.

**Vector QR scaled down too aggressively.** Even vector QRs have practical minimum sizes (typically 1.5 cm for print). Smaller is hard to scan regardless of file format.

**Same QR size for different scan distances.** A QR sized for in-hand scanning fails on a wall poster, and vice versa.

**Not testing on actual production samples.** Digital proofs don't reveal real-world scan reliability.

**Skipping outdoor lighting tests.** A QR that scans indoors may fail in direct sunlight.

**Using QR size that just barely passes.** Push the size 25% larger than the minimum for safety margin.

## Conclusion

Dynamic QR code sizing is straightforward when you follow the scan-distance-divided-by-10 rule and add 20–30% safety margin. Vector formats (SVG, PDF) are best for print. Raster formats need 300+ DPI. Always preserve the quiet zone. Always test on actual production samples in production conditions.

For most placements (product packaging, table stickers, business cards), 2.5–3 cm × 2.5–3 cm is the sweet spot. For posters and signage, scale up based on viewing distance. For billboards, go big — and use a custom branded short domain so the QR encoded URL is as short as possible.

[Create a dynamic QR free](/signup/) and download in SVG, PNG, or PDF at any size up to 4096 px.

## Related reading

- [How to add a logo to your dynamic QR code](/blog/dynamic-qr-code-with-logo-guide/)
- [Dynamic QR code color theory: brand colors that still scan](/blog/dynamic-qr-code-color-theory/)
- [How to use dynamic QR codes for print marketing](/blog/dynamic-qr-codes-print-marketing/)
- [How to create a dynamic QR code (step by step)](/blog/how-to-create-dynamic-qr-code/)
