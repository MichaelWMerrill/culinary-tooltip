import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    title: 'Empirical BBQ — Field Notes',
    description:
      'The science, data, and hard-won technique behind precision low-and-slow cooking, from Empirical BBQ.',
    // context.site comes from `site` in astro.config.mjs (https://empiricalbbq.com).
    site: context.site,
    // @astrojs/rss appends a trailing slash by default, which would emit
    // /blog/<slug>/ — a URL that redirects, and that doesn't match the
    // extensionless <link rel="canonical"> or the sitemap. Feed links are a
    // discovery path for new posts, so they must be the canonical form.
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}`,
    })),
    customData: `<language>en-us</language>`,
  });
}
