// Public values — safe to ship in a static page. Data is protected by RLS.
// The service-role key never belongs here.
export const SUPABASE_URL = 'https://REPLACE_WITH_PROJECT_REF.supabase.co';
export const SUPABASE_ANON_KEY = 'REPLACE_WITH_ANON_KEY';

export const isConfigured =
  !SUPABASE_URL.includes('REPLACE_WITH') && !SUPABASE_ANON_KEY.includes('REPLACE_WITH');
