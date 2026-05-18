export const SITE = {
  url: import.meta.env.PUBLIC_SITE_URL || 'https://dynamicqrcodelabs.com',
  name: 'Dynamic QR Code Labs',
  shortName: 'QR Labs',
  brand: 'Dynamic QR Code Labs',
  brandShort: 'QR Labs',
  tagline: 'Dynamic QR Codes. Editable forever. Track every scan.',
  description:
    'Create dynamic QR codes you can edit anytime after printing. Track scans in real time, customize designs, run smart redirects, and manage campaigns from one platform.',
  defaultOgImage: '/og/default.png',
  twitterHandle: '@dynamicqrlabs',
  locale: 'en_US',
  contactEmail: 'hello@dynamicqrcodelabs.com',
  founderName: 'The Dynamic QR Code Labs Team',
  foundingYear: 2026,
  socials: {
    twitter: 'https://twitter.com/dynamicqrlabs',
    linkedin: 'https://www.linkedin.com/company/dynamicqrcodelabs',
    github: 'https://github.com/dynamicqrcodelabs',
  },
} as const;

export const NAV_LINKS = [
  { href: '/features/', label: 'Features' },
  { href: '/use-cases/', label: 'Use Cases' },
  { href: '/pricing/', label: 'Pricing' },
  { href: '/blog/', label: 'Blog' },
  { href: '/about/', label: 'About' },
] as const;

export const FOOTER_LINKS = {
  product: [
    { href: '/features/', label: 'Features' },
    { href: '/pricing/', label: 'Pricing' },
    { href: '/use-cases/', label: 'Use Cases' },
    { href: '/qr-code-generator/', label: 'QR Code Generator' },
    { href: '/dynamic-vs-static-qr/', label: 'Dynamic vs Static QR' },
  ],
  resources: [
    { href: '/blog/', label: 'Blog' },
    { href: '/blog/what-is-a-dynamic-qr-code/', label: 'What is a Dynamic QR?' },
    { href: '/blog/best-dynamic-qr-code-generators-2026/', label: 'Best QR Generators 2026' },
    { href: '/blog/qr-code-analytics-guide/', label: 'QR Analytics Guide' },
  ],
  company: [
    { href: '/about/', label: 'About' },
    { href: '/contact/', label: 'Contact' },
    { href: '/privacy/', label: 'Privacy' },
    { href: '/terms/', label: 'Terms' },
  ],
} as const;
