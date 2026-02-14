import { Router } from 'express';
import { supabaseAnon } from '../config/supabase.js';
import { setAuthCookies, clearAuthCookies } from '../middleware/auth.js';

const router = Router();

// GET /login
router.get('/login', (req, res) => {
  if (res.locals.user) return res.redirect('/');
  res.render('login', {
    title: 'Sign In — The TebPaper',
    error: req.query.error,
  });
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', {
      title: 'Sign In — The TebPaper',
      error: 'Email and password are required.',
      email,
    });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.render('login', {
      title: 'Sign In — The TebPaper',
      error: error.message,
      email,
    });
  }

  setAuthCookies(res, data.session);
  res.redirect('/');
});

// GET /register
router.get('/register', (req, res) => {
  if (res.locals.user) return res.redirect('/');
  res.render('register', {
    title: 'Create Account — The TebPaper',
    error: req.query.error,
  });
});

// POST /register
router.post('/register', async (req, res) => {
  const { email, password, password_confirm, display_name } = req.body;

  if (!email || !password) {
    return res.render('register', {
      title: 'Create Account — The TebPaper',
      error: 'Email and password are required.',
      email,
      display_name,
    });
  }

  if (password !== password_confirm) {
    return res.render('register', {
      title: 'Create Account — The TebPaper',
      error: 'Passwords do not match.',
      email,
      display_name,
    });
  }

  if (password.length < 8) {
    return res.render('register', {
      title: 'Create Account — The TebPaper',
      error: 'Password must be at least 8 characters.',
      email,
      display_name,
    });
  }

  const { data, error } = await supabaseAnon.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: display_name || email.split('@')[0] },
    },
  });

  if (error) {
    return res.render('register', {
      title: 'Create Account — The TebPaper',
      error: error.message,
      email,
      display_name,
    });
  }

  // If email confirmation is disabled, sign in immediately
  if (data.session) {
    setAuthCookies(res, data.session);
    return res.redirect('/settings');
  }

  // Otherwise show confirmation message
  res.render('login', {
    title: 'Sign In — The TebPaper',
    success: 'Account created. Please check your email to confirm, then sign in.',
  });
});

// POST /logout
router.post('/logout', (req, res) => {
  clearAuthCookies(res);
  res.redirect('/login');
});

// GET /logout (progressive enhancement fallback)
router.get('/logout', (req, res) => {
  clearAuthCookies(res);
  res.redirect('/login');
});

export default router;
