import { createUserClient, supabaseAnon } from '../config/supabase.js';

// Middleware: attach user and supabase client to request if authenticated
export async function attachUser(req, res, next) {
  const accessToken = req.cookies['sb-access-token'];
  const refreshToken = req.cookies['sb-refresh-token'];

  res.locals.user = null;
  req.supabase = createUserClient(null);

  if (!accessToken) {
    return next();
  }

  // Try to get user from access token
  const { data: { user }, error } = await supabaseAnon.auth.getUser(accessToken);

  if (error && refreshToken) {
    // Token expired — try refresh
    const { data: session, error: refreshError } = await supabaseAnon.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (!refreshError && session?.session) {
      setAuthCookies(res, session.session);
      res.locals.user = session.session.user;
      req.supabase = createUserClient(session.session.access_token);
      return next();
    }

    // Refresh failed — clear cookies
    clearAuthCookies(res);
    return next();
  }

  if (user) {
    res.locals.user = user;
    req.supabase = createUserClient(accessToken);
  }

  next();
}

// Middleware: require authentication, redirect to login if not
export function requireAuth(req, res, next) {
  if (!res.locals.user) {
    return res.redirect('/login');
  }
  next();
}

// Set auth cookies from a Supabase session
export function setAuthCookies(res, session) {
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };

  res.cookie('sb-access-token', session.access_token, cookieOpts);
  res.cookie('sb-refresh-token', session.refresh_token, cookieOpts);
}

// Clear auth cookies
export function clearAuthCookies(res) {
  res.clearCookie('sb-access-token', { path: '/' });
  res.clearCookie('sb-refresh-token', { path: '/' });
}
