import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../lib/site';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = await getCollection('articles', ({ data }) => !data.draft);

  return rss({
    title: `${SITE.name} Blog`,
    description:
      'Guides, tutorials, comparisons, and analytics deep-dives on dynamic QR codes.',
    site: context.site ?? SITE.url,
    items: articles
      .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf())
      .map((article) => ({
        title: article.data.title,
        description: article.data.description,
        pubDate: article.data.publishedAt,
        link: `/blog/${article.id.replace(/\.md$/, '')}/`,
        categories: [article.data.category, ...article.data.tags],
        author: article.data.author,
      })),
    customData: `<language>en-us</language>`,
  });
}
