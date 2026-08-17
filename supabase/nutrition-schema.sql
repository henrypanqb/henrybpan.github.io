-- FiveCode nutrition tracker — Phase 1 schema + RLS.
-- Applied via the Supabase MCP `apply_migration` tool (name: nutrition_schema)
-- or pasted into the dashboard SQL editor.

-- Foods library
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  name text not null,
  category text not null check (category in ('protein','fat','carb')),
  serving_label text not null,
  calories numeric not null default 0,
  protein numeric not null default 0,
  fat numeric not null default 0,
  carb numeric not null default 0,
  is_custom boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  name text not null,
  notes text,
  target_calories numeric, target_protein numeric, target_fat numeric, target_carb numeric,
  created_at timestamptz not null default now()
);

create table if not exists plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans(id) on delete cascade,
  day_index int not null,
  label text not null,
  target_calories numeric, target_protein numeric, target_fat numeric, target_carb numeric
);

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references plan_days(id) on delete cascade,
  position int not null default 0,
  name text not null
);

create table if not exists meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  position int not null default 0,
  food_id uuid not null references foods(id) on delete restrict,
  servings numeric not null default 1
);

-- Lookup indexes for the read paths the app actually uses.
create index if not exists foods_user_idx on foods (user_id, category, name);
create index if not exists plan_days_plan_idx on plan_days (plan_id, day_index);
create index if not exists meals_day_idx on meals (day_id, position);
create index if not exists meal_items_meal_idx on meal_items (meal_id, position);

-- RLS: single-user isolation
alter table foods enable row level security;
alter table plans enable row level security;
alter table plan_days enable row level security;
alter table meals enable row level security;
alter table meal_items enable row level security;

drop policy if exists "own foods" on foods;
create policy "own foods" on foods for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own plans" on plans;
create policy "own plans" on plans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own plan_days" on plan_days;
create policy "own plan_days" on plan_days for all
  using (exists (select 1 from plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from plans p where p.id = plan_id and p.user_id = auth.uid()));

drop policy if exists "own meals" on meals;
create policy "own meals" on meals for all
  using (exists (select 1 from plan_days d join plans p on p.id = d.plan_id where d.id = day_id and p.user_id = auth.uid()))
  with check (exists (select 1 from plan_days d join plans p on p.id = d.plan_id where d.id = day_id and p.user_id = auth.uid()));

drop policy if exists "own meal_items" on meal_items;
create policy "own meal_items" on meal_items for all
  using (exists (select 1 from meals m join plan_days d on d.id = m.day_id join plans p on p.id = d.plan_id where m.id = meal_id and p.user_id = auth.uid()))
  with check (exists (select 1 from meals m join plan_days d on d.id = m.day_id join plans p on p.id = d.plan_id where m.id = meal_id and p.user_id = auth.uid()));
