/*
 * Single source of truth for the site's author identity.
 *
 * Every page that names an author — blog posts, the methodology page, the about
 * page — reads from here, so the visible byline and the JSON-LD `Person` can
 * never disagree. Search and ad-quality crawlers weigh a consistent, named,
 * linkable author (E-E-A-T); a byline that says one thing while the structured
 * data says "Organization" is worse than no byline at all.
 *
 * Claims here are deliberately modest and verifiable. The site's authority
 * comes from citing published sources and showing its math on /methodology —
 * not from asserting credentials the author doesn't hold.
 */

/** Display name used for visible bylines. */
export const AUTHOR_NAME = 'Mike Merrill';

/** Canonical URL of the author's bio page. */
export const AUTHOR_URL = 'https://empiricalbbq.com/about';

/** One-line role, used under bylines and in the Person schema. */
export const AUTHOR_ROLE = 'Creator of Empirical BBQ';

/**
 * schema.org Person for the site author. Spread into `author` on Article /
 * TechArticle blocks.
 */
export const AUTHOR_SCHEMA = {
  '@type': 'Person',
  name: AUTHOR_NAME,
  url: AUTHOR_URL,
  jobTitle: AUTHOR_ROLE,
  description:
    'Software and data professional with a B.S. in Computer Science and a decade in senior technical roles in public-sector systems, who builds physics-based barbecue calculators to replace guesswork with measured, sourced models.',
  knowsAbout: [
    'barbecue',
    'smoking meat',
    'heat transfer',
    'evaporative cooling',
    'data modeling',
  ],
};
