import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /settings
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const { data: profile } = await req.supabase
      .from('profiles')
      .select('*')
      .eq('id', res.locals.user.id)
      .single();

    const { data: categories } = await req.supabase
      .from('category_preferences')
      .select('*')
      .eq('user_id', res.locals.user.id)
      .order('category');

    const { data: sources } = await req.supabase
      .from('preferred_sources')
      .select('*')
      .eq('user_id', res.locals.user.id)
      .order('source_name');

    res.render('settings', {
      title: 'Settings — The TebPaper',
      profile,
      categories: categories || [],
      sources: sources || [],
      success: req.query.saved === '1' ? 'Settings saved.' : null,
    });
  } catch (err) {
    console.error('Error loading settings:', err);
    res.render('settings', {
      title: 'Settings — The TebPaper',
      error: 'Failed to load settings.',
    });
  }
});

// POST /settings/profile
router.post('/settings/profile', requireAuth, async (req, res) => {
  const { display_name, political_leaning, digest_frequency } = req.body;

  try {
    await req.supabase
      .from('profiles')
      .update({
        display_name,
        political_leaning,
        digest_frequency,
        updated_at: new Date().toISOString(),
      })
      .eq('id', res.locals.user.id);

    res.redirect('/settings?saved=1');
  } catch (err) {
    console.error('Error saving profile:', err);
    res.redirect('/settings?error=1');
  }
});

// POST /settings/categories
router.post('/settings/categories', requireAuth, async (req, res) => {
  try {
    const { data: existing } = await req.supabase
      .from('category_preferences')
      .select('*')
      .eq('user_id', res.locals.user.id);

    // Form sends: category_<name>_enabled, category_<name>_weight
    const updates = (existing || []).map((cat) => {
      const enabled = req.body[`category_${cat.category}_enabled`] === 'on';
      const weight = parseInt(req.body[`category_${cat.category}_weight`], 10) || cat.weight;
      return {
        id: cat.id,
        user_id: res.locals.user.id,
        category: cat.category,
        enabled,
        weight: Math.min(10, Math.max(1, weight)),
      };
    });

    for (const update of updates) {
      await req.supabase
        .from('category_preferences')
        .update({ enabled: update.enabled, weight: update.weight })
        .eq('id', update.id);
    }

    res.redirect('/settings?saved=1');
  } catch (err) {
    console.error('Error saving categories:', err);
    res.redirect('/settings?error=1');
  }
});

// POST /settings/sources/add
router.post('/settings/sources/add', requireAuth, async (req, res) => {
  const { source_name, feed_url, is_writer } = req.body;

  if (!source_name) {
    return res.redirect('/settings');
  }

  try {
    await req.supabase
      .from('preferred_sources')
      .insert({
        user_id: res.locals.user.id,
        source_name,
        feed_url: feed_url || null,
        is_writer: is_writer === 'on',
      });

    res.redirect('/settings?saved=1');
  } catch (err) {
    console.error('Error adding source:', err);
    res.redirect('/settings?error=1');
  }
});

// POST /settings/sources/remove
router.post('/settings/sources/remove', requireAuth, async (req, res) => {
  const { source_id } = req.body;

  try {
    await req.supabase
      .from('preferred_sources')
      .delete()
      .eq('id', source_id)
      .eq('user_id', res.locals.user.id);

    res.redirect('/settings?saved=1');
  } catch (err) {
    console.error('Error removing source:', err);
    res.redirect('/settings?error=1');
  }
});

export default router;
