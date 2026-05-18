import { SITE } from './site';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE.url}/logo.png`,
      width: 512,
      height: 512,
    },
    description: SITE.description,
    foundingDate: `${SITE.foundingYear}-01-01`,
    sameAs: [SITE.socials.twitter, SITE.socials.linkedin, SITE.socials.github],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SITE.contactEmail,
      availableLanguage: ['English'],
    },
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    publisher: { '@id': `${SITE.url}/#organization` },
    inLanguage: 'en-US',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/search/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function softwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    description: SITE.description,
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        name: 'Free',
      },
      {
        '@type': 'Offer',
        price: '12',
        priceCurrency: 'USD',
        name: 'Starter',
      },
      {
        '@type': 'Offer',
        price: '39',
        priceCurrency: 'USD',
        name: 'Pro',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '247',
      bestRating: '5',
      worstRating: '1',
    },
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE.url}${item.url}`,
    })),
  };
}

export function articleSchema(params: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  image?: string;
  wordCount?: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: params.title,
    description: params.description,
    image: params.image
      ? `${SITE.url}${params.image}`
      : `${SITE.url}${SITE.defaultOgImage}`,
    datePublished: params.publishedAt,
    dateModified: params.updatedAt || params.publishedAt,
    wordCount: params.wordCount,
    inLanguage: 'en-US',
    author: {
      '@type': 'Person',
      name: params.author,
      url: `${SITE.url}/about/`,
    },
    publisher: { '@id': `${SITE.url}/#organization` },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE.url}/blog/${params.slug}/`,
    },
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function productSchema(params: {
  name: string;
  description: string;
  price: string;
  currency?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: params.name,
    description: params.description,
    brand: { '@type': 'Brand', name: SITE.name },
    offers: {
      '@type': 'Offer',
      price: params.price,
      priceCurrency: params.currency || 'USD',
      availability: 'https://schema.org/InStock',
    },
  };
}
