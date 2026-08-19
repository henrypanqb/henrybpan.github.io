const { ref, reactive, computed, h, onMounted } = Vue;
import {
  loadPlan, addItem, updateItemServings, removeItem,
  addPlanDay, addMeal, data, loadFoods,
} from '../store.js';
import { itemMacros, sumMacros, vsTarget } from '../calc.js';
import { FoodPicker } from './food-picker.js';
import { macroChips } from './macro-chips.js';
import { icon } from '../icons.js';

const KEYS = [
  { k: 'calories', label: 'Cals' },
  { k: 'protein', label: 'Protein' },
  { k: 'fat', label: 'Fat' },
  { k: 'carb', label: 'Carbs' },
];
const STEP = 0.25;

export function PlanDetail(planId) {
  return {
    setup() {
      const st = reactive({ plan: null, days: [], meals: [], items: [] });
      const activeDay = ref(null);
      const picking = ref(null); // meal id currently being added to
      const loading = ref(true);

      const foodsById = computed(() =>
        Object.fromEntries(data.foods.map((f) => [f.id, f])));

      const refresh = async () => {
        const r = await loadPlan(planId);
        Object.assign(st, r);
        const stillThere = r.days.some((d) => d.id === activeDay.value);
        if (!stillThere) activeDay.value = r.days[0]?.id ?? null;
      };

      onMounted(async () => {
        if (!data.foods.length) await loadFoods();
        await refresh();
        loading.value = false;
      });

      const mealsOfDay = (dayId) => st.meals.filter((m) => m.day_id === dayId);
      const itemsOfMeal = (mealId) => st.items.filter((i) => i.meal_id === mealId);
      const mealTotal = (mealId) =>
        sumMacros(itemsOfMeal(mealId).map((i) => itemMacros(foodsById.value[i.food_id], i.servings)));
      const dayTotal = (dayId) => sumMacros(mealsOfDay(dayId).map((m) => mealTotal(m.id)));

      const target = computed(() => {
        const d = st.days.find((x) => x.id === activeDay.value);
        const p = st.plan;
        if (!p) return null;
        return {
          calories: d?.target_calories ?? p.target_calories,
          protein: d?.target_protein ?? p.target_protein,
          fat: d?.target_fat ?? p.target_fat,
          carb: d?.target_carb ?? p.target_carb,
        };
      });

      const onPick = async (foodId, servings) => {
        const mealId = picking.value;
        picking.value = null;
        await addItem(mealId, foodId, servings);
        await refresh();
      };
      const setServings = async (id, v) => {
        const n = Number(v);
        if (!(n > 0)) return;
        await updateItemServings(id, n);
        await refresh();
      };
      const bumpServings = (item, delta) =>
        setServings(item.id, Math.max(STEP, Math.round((Number(item.servings) + delta) * 100) / 100));
      const del = async (id) => { await removeItem(id); await refresh(); };
      const newDay = async () => {
        const { day } = await addPlanDay(planId, st.days.length + 1);
        await refresh();
        if (day) activeDay.value = day.id;
      };
      const newMeal = async () => {
        const meals = mealsOfDay(activeDay.value);
        await addMeal(activeDay.value, meals.length + 1, 'Meal ' + (meals.length + 1));
        await refresh();
      };

      return () => {
        if (loading.value) {
          return h('div', { class: 'skel' }, [1, 2, 3, 4, 5].map((n) => h('div', { class: 'skel-row', key: n })));
        }
        if (!st.plan) {
          return h('div', {}, [
            h('a', { class: 'back', href: '#/plans' }, [icon('back', 16), 'Plans']),
            h('div', { class: 'empty' }, [h('strong', 'Plan not found'), 'It may have been deleted.']),
          ]);
        }

        const dayId = activeDay.value;
        const cmp = vsTarget(dayTotal(dayId), target.value);
        const meals = mealsOfDay(dayId);

        return h('div', {}, [
          h('a', { class: 'back', href: '#/plans' }, [icon('back', 16), 'Plans']),
          h('h1', st.plan.name),

          h('div', { class: 'day-tabs', role: 'tablist' }, [
            ...st.days.map((d) =>
              h('button', {
                key: d.id, role: 'tab',
                'aria-selected': d.id === dayId,
                class: ['day-tab', d.id === dayId ? 'is-active' : ''],
                onClick: () => (activeDay.value = d.id),
              }, d.label)),
            h('button', { class: 'day-tab is-add', 'aria-label': 'Add a day', onClick: newDay },
              [icon('plus', 14), 'Day']),
          ]),

          h('div', { class: 'targets' }, KEYS.map(({ k, label }) =>
            h('div', { class: ['target-row', k], key: k }, [
              h('span', { class: 'target-k' }, label),
              h('div', {
                class: 'bar', role: 'progressbar',
                'aria-label': `${label}: ${cmp[k].actual} of ${cmp[k].target || 'no target'}`,
                'aria-valuenow': cmp[k].pct, 'aria-valuemin': 0, 'aria-valuemax': 100,
              }, h('div', {
                class: ['fill', cmp[k].met ? 'met' : ''],
                style: { width: Math.min(100, cmp[k].pct) + '%' },
              })),
              h('span', { class: 'target-v' }, [
                cmp[k].met ? h('span', { class: 'met-mark' }, '✓ ') : null,
                String(cmp[k].actual),
                h('span', { class: 'of' }, ` / ${cmp[k].target || '—'}`),
              ]),
            ])
          )),

          ...meals.map((m) => {
            const mt = mealTotal(m.id);
            const items = itemsOfMeal(m.id);
            return h('section', { class: 'meal', key: m.id }, [
              h('div', { class: 'meal-head' }, [
                h('span', { class: 'meal-name' }, m.name),
                h('span', { class: 'meal-cal' }, `${mt.calories} cal`),
              ]),
              items.length ? macroChips(mt) : null,
              items.length
                ? h('ul', { class: 'item-list' }, items.map((i) => {
                    const f = foodsById.value[i.food_id];
                    return h('li', { key: i.id }, [
                      h('div', { class: 'item-main' }, [
                        h('div', { class: ['item-name', f ? '' : 'item-missing'] },
                          f ? f.name : 'Deleted food'),
                        h('div', { class: 'item-sub' }, f
                          ? `${i.servings} × ${f.serving_label} · ${itemMacros(f, i.servings).calories} cal`
                          : 'No longer in your library'),
                      ]),
                      h('div', { class: 'stepper' }, [
                        h('button', { 'aria-label': `Fewer servings of ${f ? f.name : 'item'}`, onClick: () => bumpServings(i, -STEP) }, icon('minus', 15)),
                        h('input', {
                          type: 'number', step: String(STEP), min: '0', inputmode: 'decimal',
                          'aria-label': `Servings of ${f ? f.name : 'item'}`,
                          value: i.servings, onChange: (e) => setServings(i.id, e.target.value),
                        }),
                        h('button', { 'aria-label': `More servings of ${f ? f.name : 'item'}`, onClick: () => bumpServings(i, STEP) }, icon('plus', 15)),
                      ]),
                      h('button', {
                        class: 'icon-btn is-danger',
                        'aria-label': `Remove ${f ? f.name : 'item'}`,
                        onClick: () => del(i.id),
                      }, icon('trash', 17)),
                    ]);
                  }))
                : null,
              h('button', { class: 'add-item', onClick: () => (picking.value = m.id) },
                [icon('plus', 16), `Add to ${m.name}`]),
            ]);
          }),

          dayId
            ? h('button', { class: 'btn btn-block', onClick: newMeal }, [icon('utensils', 17), 'Add meal'])
            : null,
          picking.value ? h(FoodPicker(onPick, () => (picking.value = null))) : null,
        ]);
      };
    },
  };
}
