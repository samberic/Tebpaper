import Parser from 'rss-parser';
import { DEFAULT_SOURCES, leaningAffinity } from '../config/sources.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'TebPaper/1.0 (News Digest Application)',
  },
});

// Fetch and parse a single RSS feed
async function fetchFeed(source) {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items || []).map((item) => ({
      title: item.title || '',
      link: item.link || '',
      summary: item.contentSnippet || item.content || '',
      author: item.creator || item.author || source.name,
      published: item.isoDate || item.pubDate || null,
      sourceName: source.name,
      sourceLeaning: source.leaning,
      category: null, // Will be set by the category it was fetched under
    }));
  } catch (err) {
    console.error(`Failed to fetch feed ${source.name} (${source.url}):`, err.message);
    return [];
  }
}

// Fetch news articles for given categories, weighted by user preferences
export async function fetchNews({ categories, userLeaning, since }) {
  const allArticles = [];
  const fetchPromises = [];

  for (const cat of categories) {
    const sources = DEFAULT_SOURCES[cat.category] || [];
    if (!sources.length || !cat.enabled) continue;

    for (const source of sources) {
      const affinity = leaningAffinity(userLeaning, source.leaning);
      fetchPromises.push(
        fetchFeed(source).then((articles) => {
          for (const article of articles) {
            article.category = cat.category;
            article.affinityScore = affinity;
            article.categoryWeight = cat.weight;

            // Filter by date if 'since' is provided
            if (since && article.published) {
              const pubDate = new Date(article.published);
              if (pubDate < since) continue;
            }

            allArticles.push(article);
          }
        })
      );
    }
  }

  await Promise.allSettled(fetchPromises);

  // Sort by combined score: category weight * affinity * recency
  const now = Date.now();
  allArticles.sort((a, b) => {
    const scoreA = computeScore(a, now);
    const scoreB = computeScore(b, now);
    return scoreB - scoreA;
  });

  // Deduplicate by similar titles
  return deduplicateArticles(allArticles);
}

function computeScore(article, now) {
  const recency = article.published
    ? Math.max(0, 1 - (now - new Date(article.published).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0.5;
  return (article.categoryWeight / 10) * article.affinityScore * (0.3 + 0.7 * recency);
}

function deduplicateArticles(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    // Normalise title for dedup comparison
    const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
