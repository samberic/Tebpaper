import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'missing-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key';

// Client for user-scoped operations (respects RLS)
export function createUserClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  });
}

// Lazy-initialised admin client (bypasses RLS)
let _admin;
export function getAdminClient() {
  if (!_admin) {
    _admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _admin;
}

// Anon client for auth operations
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
