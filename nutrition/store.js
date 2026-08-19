// Reactive app state plus every read/write that talks to Supabase.
// Views never call the Supabase client directly.
const { reactive } = Vue;
import { supabase, isConfigured } from './supabase.js';

export const state = reactive({ session: null, ready: false, error: '' });

export const data = reactive({ foods: [], plans: [] });

function fail(error, context) {
  if (!error) return null;
  state.error = `${context}: ${error.message || error}`;
  console.error(context, error);
  return error;
}

export function clearError() { state.error = ''; }

// --- auth -----------------------------------------------------------------

export async function initAuth() {
  if (!isConfigured) {
    state.error = 'Supabase is not configured yet — fill in nutrition/config.js.';
    state.ready = true;
    return;
  }
  const { data: got, error } = await supabase.auth.getSession();
  fail(error, 'Reading session');
  state.session = got?.session ?? null;
  state.ready = true;
  supabase.auth.onAuthStateChange((_e, session) => { state.session = session; });
}

export async function signIn(email) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + '/nutrition/' },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
  data.foods = [];
  data.plans = [];
}

// --- foods ----------------------------------------------------------------

export async function loadFoods() {
  const { data: rows, error } = await supabase
    .from('foods').select('*').order('category').order('name');
  if (!fail(error, 'Loading foods')) data.foods = rows;
  return { error };
}

export async function addFood(food) {
  const { data: row, error } = await supabase.from('foods').insert(food).select().single();
  if (!fail(error, 'Adding food')) data.foods = [...data.foods, row];
  return { row, error };
}

export async function updateFood(id, patch) {
  const { data: row, error } = await supabase
    .from('foods').update(patch).eq('id', id).select().single();
  if (!fail(error, 'Updating food')) {
    data.foods = data.foods.map((f) => (f.id === id ? row : f));
  }
  return { row, error };
}

// --- plans ----------------------------------------------------------------

export async function loadPlans() {
  const { data: rows, error } = await supabase.from('plans').select('*').order('created_at');
  if (!fail(error, 'Loading plans')) data.plans = rows;
  return { error };
}

export async function createPlan(name) {
  const t = getTargets();
  const { data: plan, error } = await supabase.from('plans')
    .insert({
      name,
      target_calories: t.calories, target_protein: t.protein,
      target_fat: t.fat, target_carb: t.carb,
    })
    .select().single();
  if (fail(error, 'Creating plan')) return { error };

  const { data: day, error: dayErr } = await supabase.from('plan_days')
    .insert({ plan_id: plan.id, day_index: 1, label: 'Day 1' }).select().single();
  if (fail(dayErr, 'Creating first day')) return { error: dayErr };

  const { error: mealErr } = await supabase.from('meals').insert(
    [1, 2, 3].map((n) => ({ day_id: day.id, position: n, name: 'Meal ' + n }))
  );
  if (fail(mealErr, 'Creating meals')) return { error: mealErr };

  data.plans = [...data.plans, plan];
  return { plan };
}

export async function renamePlan(id, name) {
  const { data: row, error } = await supabase
    .from('plans').update({ name }).eq('id', id).select().single();
  if (!fail(error, 'Renaming plan')) {
    data.plans = data.plans.map((p) => (p.id === id ? row : p));
  }
  return { row, error };
}

export async function renameDay(id, label) {
  const { data: row, error } = await supabase
    .from('plan_days').update({ label }).eq('id', id).select().single();
  fail(error, 'Renaming day');
  return { row, error };
}

export async function addPlanDay(planId, dayIndex) {
  const { data: day, error } = await supabase.from('plan_days')
    .insert({ plan_id: planId, day_index: dayIndex, label: 'Day ' + dayIndex })
    .select().single();
  if (fail(error, 'Adding day')) return { error };
  const { error: mealErr } = await supabase.from('meals').insert(
    [1, 2, 3].map((n) => ({ day_id: day.id, position: n, name: 'Meal ' + n }))
  );
  fail(mealErr, 'Adding meals');
  return { day, error: mealErr };
}

export async function addMeal(dayId, position, name) {
  const { data: row, error } = await supabase.from('meals')
    .insert({ day_id: dayId, position, name }).select().single();
  fail(error, 'Adding meal');
  return { row, error };
}

export async function loadPlan(planId) {
  const { data: plan, error } = await supabase
    .from('plans').select('*').eq('id', planId).single();
  if (fail(error, 'Loading plan')) return { plan: null, days: [], meals: [], items: [] };

  const { data: days, error: dayErr } = await supabase
    .from('plan_days').select('*').eq('plan_id', planId).order('day_index');
  if (fail(dayErr, 'Loading days')) return { plan, days: [], meals: [], items: [] };

  const dayIds = days.map((d) => d.id);
  const { data: meals, error: mealErr } = dayIds.length
    ? await supabase.from('meals').select('*').in('day_id', dayIds).order('position')
    : { data: [], error: null };
  if (fail(mealErr, 'Loading meals')) return { plan, days, meals: [], items: [] };

  const mealIds = meals.map((m) => m.id);
  const { data: items, error: itemErr } = mealIds.length
    ? await supabase.from('meal_items').select('*').in('meal_id', mealIds).order('position')
    : { data: [], error: null };
  fail(itemErr, 'Loading items');

  return { plan, days, meals, items: items || [] };
}

export async function updatePlanTargets(planId, targets) {
  const { error } = await supabase.from('plans').update({
    target_calories: targets.calories, target_protein: targets.protein,
    target_fat: targets.fat, target_carb: targets.carb,
  }).eq('id', planId);
  fail(error, 'Saving targets');
  return { error };
}

// --- meal items -----------------------------------------------------------

export async function addItem(mealId, foodId, servings) {
  const { data: row, error } = await supabase.from('meal_items')
    .insert({ meal_id: mealId, food_id: foodId, servings }).select().single();
  fail(error, 'Adding item');
  return { row, error };
}

export async function updateItemServings(id, servings) {
  const { error } = await supabase.from('meal_items').update({ servings }).eq('id', id);
  fail(error, 'Updating servings');
  return { error };
}

export async function removeItem(id) {
  const { error } = await supabase.from('meal_items').delete().eq('id', id);
  fail(error, 'Removing item');
  return { error };
}

// --- default targets (local to the device for Phase 1) --------------------

const TKEY = 'nutrition.targets';
const DEFAULT_TARGETS = { calories: 3150, protein: 135, fat: 105, carb: 306 };

export function getTargets() {
  try {
    return { ...DEFAULT_TARGETS, ...(JSON.parse(localStorage.getItem(TKEY)) || {}) };
  } catch {
    return { ...DEFAULT_TARGETS };
  }
}

export function setTargets(t) {
  localStorage.setItem(TKEY, JSON.stringify(t));
}
