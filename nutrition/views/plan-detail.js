const { ref, reactive, computed, h, onMounted } = Vue;
import {
  loadPlan, addItem, updateItemServings, removeItem,
  addPlanDay, addMeal, data, loadFoods,
} from '../store.js';
import { itemMacros, sumMacros, vsTarget } from '../calc.js';
import { FoodPicker } from './food-picker.js';

const KEYS = ['calories', 'protein', 'fat', 'carb'];

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
      const changeServings = async (id, v) => {
        const n = Number(v);
        if (!(n > 0)) return;
        await updateItemServings(id, n);
        await refresh();
      };
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
        if (loading.value) return h('p', { class: 'empty' }, 'Loading…');
        if (!st.plan) return h('p', { class: 'empty' }, 'Plan not found.');

        const dayId = activeDay.value;
        const cmp = vsTarget(dayTotal(dayId), target.value);

        return h('div', {}, [
          h('a', { class: 'back', href: '#/plans' }, '← Plans'),
          h('h1', st.plan.name),
          h('div', { class: 'day-tabs' }, [
            ...st.days.map((d) =>
              h('button', {
                key: d.id,
                class: ['day-tab', d.id === dayId ? 'is-active' : ''],
                onClick: () => (activeDay.value = d.id),
              }, d.label)),
            h('button', { class: 'day-tab', onClick: newDay }, '+ day'),
          ]),
          h('div', { class: 'targets' }, KEYS.map((k) =>
            h('div', { class: 'target-row', key: k }, [
              h('span', k),
              h('div', { class: 'bar' },
                h('div', {
                  class: ['fill', cmp[k].met ? 'met' : ''],
                  style: { width: Math.min(100, cmp[k].pct) + '%' },
                })),
              h('span', { class: 'num' }, `${cmp[k].actual} / ${cmp[k].target || '—'}`),
            ])
          )),
          ...mealsOfDay(dayId).map((m) => {
            const mt = mealTotal(m.id);
            return h('section', { class: 'meal', key: m.id }, [
              h('div', { class: 'meal-head' }, [
                h('span', m.name),
                h('span', { class: 'num' },
                  `${mt.calories} cal · P${mt.protein} F${mt.fat} C${mt.carb}`),
              ]),
              h('ul', { class: 'item-list' }, itemsOfMeal(m.id).map((i) => {
                const f = foodsById.value[i.food_id];
                return h('li', { key: i.id }, [
                  h('span', f ? `${f.name} · ${f.serving_label}` : '(deleted food)'),
                  h('input', {
                    class: 'srv', type: 'number', step: '0.05', min: '0', inputmode: 'decimal',
                    value: i.servings, onChange: (e) => changeServings(i.id, e.target.value),
                  }),
                  h('button', { class: 'x', title: 'Remove', onClick: () => del(i.id) }, '×'),
                ]);
              })),
              h('button', { class: 'add-item', onClick: () => (picking.value = m.id) }, '+ add'),
            ]);
          }),
          dayId ? h('button', { class: 'add-btn', onClick: newMeal }, '+ Add meal') : null,
          picking.value ? h(FoodPicker(onPick, () => (picking.value = null))) : null,
        ]);
      };
    },
  };
}
