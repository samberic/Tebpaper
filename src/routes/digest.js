import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateDigest } from '../services/digest.js';
import { fetchNews } from '../services/news.js';
import { curateDigest } from '../services/curator.js';
import { enrichWithArchive } from '../services/archive.js';

const router = Router();

// Default categories for anonymous users
const DEFAULT_CATEGORIES = [
  { category: 'national', weight: 8, enabled: true },
  { category: 'international', weight: 8, enabled: true },
  { category: 'sport', weight: 5, enabled: true },
  { category: 'economy', weight: 6, enabled: true },
  { category: 'technology', weight: 5, enabled: true },
  { category: 'opinion', weight: 4, enabled: true },
  { category: 'science', weight: 5, enabled: true },
];

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

function buildDigestView(articles, digest) {
  const lead = articles[0] || null;
  const secondary = articles.slice(1, 3);
  const remaining = articles.slice(3);

  const byCategory = {};
  for (const article of remaining) {
    const cat = article.category || 'general';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(article);
  }

  return {
    digest,
    lead,
    secondary,
    byCategory,
    formatDate: fmtDate(digest.created_at || new Date()),
    periodStart: fmtDate(digest.period_start || new Date(Date.now() - 7 * 86400000)),
    periodEnd: fmtDate(digest.period_end || new Date()),
  };
}

// GET / — home page for everyone
router.get('/', async (req, res) => {
  const user = res.locals.user;

  // Logged-in user with Supabase configured: show their saved digest
  if (user) {
    try {
      const { data: profile } = await req.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: digest } = await req.supabase
        .from('digests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!digest) {
        return res.render('home', {
          title: 'The TebPaper',
          profile,
          noDigest: true,
        });
      }

      const { data: articles } = await req.supabase
        .from('digest_articles')
        .select('*')
        .eq('digest_id', digest.id)
        .order('importance', { ascending: false })
        .order('position', { ascending: true });

      const view = buildDigestView(articles || [], digest);
      return res.render('digest', {
        title: 'The TebPaper',
        profile,
        ...view,
      });
    } catch (err) {
      console.error('Error loading digest:', err);
      return res.render('home', {
        title: 'The TebPaper',
        error: 'Failed to load your digest. Please try again.',
      });
    }
  }

  // Not logged in: show the generate page
  res.render('home', {
    title: 'The TebPaper',
    noDigest: true,
    isAnonymous: true,
  });
});

// POST /generate — generate a digest (works for both logged-in and anonymous)
router.post('/generate', async (req, res) => {
  const user = res.locals.user;
  const leaning = req.body.political_leaning || 'centre';

  // Logged-in: use Supabase-backed generation
  if (user) {
    try {
      const { data: profile } = await req.supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: categories } = await req.supabase
        .from('category_preferences')
        .select('*')
        .eq('user_id', user.id);

      await generateDigest({
        supabase: req.supabase,
        userId: user.id,
        profile,
        categories: categories || [],
      });

      return res.redirect('/');
    } catch (err) {
      console.error('Error generating digest:', err);
      return res.render('home', {
        title: 'The TebPaper',
        error: `Failed to generate digest: ${err.message}`,
        noDigest: true,
      });
    }
  }

  // Anonymous: generate in-memory (not persisted)
  try {
    const since = new Date(Date.now() - 7 * 86400000);

    const rawArticles = await fetchNews({
      categories: DEFAULT_CATEGORIES,
      userLeaning: leaning,
      since,
    });

    if (rawArticles.length === 0) {
      return res.render('home', {
        title: 'The TebPaper',
        error: 'Could not fetch any news articles. Please try again later.',
        noDigest: true,
        isAnonymous: true,
      });
    }

    const curated = await curateDigest({
      articles: rawArticles,
      userLeaning: leaning,
      frequency: 'weekly',
      categories: DEFAULT_CATEGORIES,
    });

    const articles = curated.articles.map((article, position) => {
      const original = rawArticles[article.index] || {};
      const enriched = enrichWithArchive({ ...original, original_url: original.link });

      return {
        id: `anon-${position}`,
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

    articles.sort((a, b) => b.importance - a.importance);

    const now = new Date();
    const view = buildDigestView(articles, {
      subtitle: curated.digest_title,
      created_at: now.toISOString(),
      period_start: since.toISOString(),
      period_end: now.toISOString(),
    });

    return res.render('digest', {
      title: 'The TebPaper',
      ...view,
      isAnonymous: true,
      leaning,
    });
  } catch (err) {
    console.error('Error generating anonymous digest:', err);
    return res.render('home', {
      title: 'The TebPaper',
      error: `Failed to generate digest: ${err.message}`,
      noDigest: true,
      isAnonymous: true,
    });
  }
});

// GET /article/:id — single article detail view (logged-in only)
router.get('/article/:id', requireAuth, async (req, res) => {
  try {
    const { data: article } = await req.supabase
      .from('digest_articles')
      .select('*, digests!inner(user_id)')
      .eq('id', req.params.id)
      .single();

    if (!article) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Article not found.',
      });
    }

    res.render('article', {
      title: `${article.title} — The TebPaper`,
      article,
    });
  } catch (err) {
    console.error('Error loading article:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load article.',
    });
  }
});

// GET /digest/history — list past digests (logged-in only)
router.get('/digest/history', requireAuth, async (req, res) => {
  try {
    const { data: digests } = await req.supabase
      .from('digests')
      .select('*')
      .eq('user_id', res.locals.user.id)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(20);

    res.render('history', {
      title: 'Past Editions — The TebPaper',
      digests: digests || [],
    });
  } catch (err) {
    console.error('Error loading history:', err);
    res.render('history', {
      title: 'Past Editions — The TebPaper',
      error: 'Failed to load digest history.',
      digests: [],
    });
  }
});

export default router;
