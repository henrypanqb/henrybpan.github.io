// One-time local seeder for the foods library. Uses the service-role key, which
// must come from the environment and must never be committed or shipped.
//
//   npm i @supabase/supabase-js
//   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… SEED_USER_ID=… node scripts/seed-nutrition.mjs
//
// Re-running is safe: foods already present for the user (same name + category)
// are skipped rather than duplicated.
import { createClient } from '@supabase/supabase-js';
import { FOODS_SEED } from '../nutrition/foods-seed.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.SEED_USER_ID;

const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SEED_USER_ID']
  .filter((n) => !process.env[n]);
if (missing.length) {
  console.error('Missing required env vars: ' + missing.join(', '));
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const { data: existing, error: readErr } = await db
  .from('foods').select('name, category').eq('user_id', userId);
if (readErr) {
  console.error('Could not read existing foods:', readErr.message);
  process.exit(1);
}

const have = new Set(existing.map((f) => `${f.category}::${f.name.toLowerCase()}`));
const rows = FOODS_SEED
  .filter((f) => !have.has(`${f.category}::${f.name.toLowerCase()}`))
  .map((f) => ({ ...f, is_custom: false, user_id: userId }));

if (!rows.length) {
  console.log('Nothing to seed — all', FOODS_SEED.length, 'foods already present.');
  process.exit(0);
}

const { error } = await db.from('foods').insert(rows);
if (error) {
  console.error('Seed failed:', error.message);
  process.exit(1);
}
console.log('Seeded', rows.length, 'foods (skipped', FOODS_SEED.length - rows.length, 'already present).');
