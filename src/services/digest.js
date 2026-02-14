import { fetchNews } from './news.js';
import { curateDigest } from './curator.js';
import { enrichWithArchive } from './archive.js';

// Orchestrate digest generation for a user
export async function generateDigest({ supabase, userId, profile, categories }) {
  const since = profile.last_digest_at
    ? new Date(profile.last_digest_at)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: past week

  const frequency = profile.digest_frequency || 'weekly';
  const userLeaning = profile.political_leaning || 'centre';

  // 1. Fetch raw articles from RSS feeds
  const rawArticles = await fetchNews({
    categories,
    userLeaning,
    since,
  });

  if (rawArticles.length === 0) {
    throw new Error('No articles found from any sources. Please check your internet connection and try again.');
  }

  // 2. Create the digest record
  const now = new Date();
  const { data: digest, error: digestError } = await supabase
    .from('digests')
    .insert({
      user_id: userId,
      title: 'The TebPaper',
      period_start: since.toISOString(),
      period_end: now.toISOString(),
      status: 'generating',
    })
    .select()
    .single();

  if (digestError) throw digestError;

  try {
    // 3. Use AI to curate and summarise
    const curated = await curateDigest({
      articles: rawArticles,
      userLeaning,
      frequency,
      categories,
    });

    // 4. Build digest articles with archive links
    const digestArticles = curated.articles.map((article, position) => {
      const original = rawArticles[article.index] || {};
      const enriched = enrichWithArchive({
        ...original,
        original_url: original.link,
      });

      return {
        digest_id: digest.id,
        title: article.headline,
        subtitle: article.subtitle,
        summary: article.summary,
        original_url: original.link || null,
        archive_url: enriched.archive_url || null,
        source_name: original.sourceName || null,
        author: original.author || null,
        category: article.category,
        importance: article.importance,
        published_at: original.published || null,
        position,
      };
    });

    // 5. Insert articles
    const { error: articlesError } = await supabase
      .from('digest_articles')
      .insert(digestArticles);

    if (articlesError) throw articlesError;

    // 6. Update digest status and subtitle
    await supabase
      .from('digests')
      .update({
        status: 'ready',
        subtitle: curated.digest_title,
      })
      .eq('id', digest.id);

    // 7. Update user's last_digest_at
    await supabase
      .from('profiles')
      .update({ last_digest_at: now.toISOString() })
      .eq('id', userId);

    return digest.id;
  } catch (err) {
    // Mark digest as failed
    await supabase
      .from('digests')
      .update({ status: 'failed' })
      .eq('id', digest.id);

    throw err;
  }
}
