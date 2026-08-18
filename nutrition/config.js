// Public values — safe to ship in a static page. Data is protected by RLS.
// The service-role key never belongs here.
export const SUPABASE_URL = 'https://hpupzuzyxjkbbaupjcib.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_GKV3Y8HgTfGxNGhnanqEQA_y0n-yjGO';

export const isConfigured =
  !SUPABASE_URL.includes('REPLACE_WITH') && !SUPABASE_ANON_KEY.includes('REPLACE_WITH');
