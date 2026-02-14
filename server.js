import express from 'express';
import { create } from 'express-handlebars';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import { attachUser } from './src/middleware/auth.js';
import { registerHelpers } from './src/utils/helpers.js';
import authRoutes from './src/routes/auth.js';
import digestRoutes from './src/routes/digest.js';
import settingsRoutes from './src/routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// --- Handlebars setup ---
const hbs = create({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
});

registerHelpers(hbs);

app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// --- Middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d' }));

// Attach Supabase user to every request
app.use(attachUser);

// Pass common data to all views
app.use((req, res, next) => {
  res.locals.user = res.locals.user || null;
  res.locals.currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Navigation state
  res.locals.isHome = req.path === '/';
  res.locals.isHistory = req.path.startsWith('/digest/history');
  res.locals.isSettings = req.path.startsWith('/settings');

  next();
});

// --- Routes ---
app.use('/', authRoutes);
app.use('/', digestRoutes);
app.use('/', settingsRoutes);

// --- View a specific past digest ---
app.get('/digest/:id', async (req, res) => {
  if (!res.locals.user) return res.redirect('/login');

  try {
    const { data: digest } = await req.supabase
      .from('digests')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', res.locals.user.id)
      .single();

    if (!digest) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'Digest not found.',
      });
    }

    const { data: profile } = await req.supabase
      .from('profiles')
      .select('*')
      .eq('id', res.locals.user.id)
      .single();

    const { data: articles } = await req.supabase
      .from('digest_articles')
      .select('*')
      .eq('digest_id', digest.id)
      .order('importance', { ascending: false })
      .order('position', { ascending: true });

    const lead = articles?.[0] || null;
    const secondary = articles?.slice(1, 3) || [];
    const remaining = articles?.slice(3) || [];

    const byCategory = {};
    for (const article of remaining) {
      const cat = article.category || 'general';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(article);
    }

    const formatDate = (d) =>
      new Date(d).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    res.render('digest', {
      title: 'The TebPaper',
      profile,
      digest,
      lead,
      secondary,
      byCategory,
      formatDate: formatDate(digest.created_at),
      periodStart: formatDate(digest.period_start),
      periodEnd: formatDate(digest.period_end),
    });
  } catch (err) {
    console.error('Error loading digest:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to load this edition.',
    });
  }
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'The page you requested does not exist.',
  });
});

// --- Error handler ---
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).render('error', {
    title: 'Error',
    message: 'An unexpected error occurred.',
  });
});

app.listen(PORT, () => {
  console.log(`The TebPaper running at http://localhost:${PORT}`);
});
