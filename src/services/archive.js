// Archive.is / archive.today integration
// Constructs archive URLs so users can read paywalled content

const ARCHIVE_BASE = 'https://archive.today/newest';

// Build an archive.is URL for a given article URL
export function getArchiveUrl(originalUrl) {
  if (!originalUrl) return null;
  return `${ARCHIVE_BASE}/${originalUrl}`;
}

// Check if a URL is likely paywalled based on known domains
const PAYWALLED_DOMAINS = [
  'ft.com',
  'economist.com',
  'telegraph.co.uk',
  'thetimes.co.uk',
  'wsj.com',
  'nytimes.com',
  'washingtonpost.com',
  'bloomberg.com',
  'newstatesman.com',
  'spectator.co.uk',
  'theathletic.com',
];

export function isLikelyPaywalled(url) {
  if (!url) return false;
  return PAYWALLED_DOMAINS.some((domain) => url.includes(domain));
}

// Enrich an article with archive URL if paywalled
export function enrichWithArchive(article) {
  if (isLikelyPaywalled(article.original_url || article.link)) {
    return {
      ...article,
      archive_url: getArchiveUrl(article.original_url || article.link),
      is_paywalled: true,
    };
  }
  return { ...article, is_paywalled: false };
}
