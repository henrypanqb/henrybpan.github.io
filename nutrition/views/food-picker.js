const { ref, computed, h, onMounted, onUnmounted } = Vue;
import { data, loadFoods } from '../store.js';
import { itemMacros } from '../calc.js';
import { icon } from '../icons.js';
import { macroChips } from './macro-chips.js';

const CAT_LABEL = { protein: 'Protein', fat: 'Fat', carb: 'Carb' };
const STEP = 0.25;

// Bottom-sheet food picker shared by the plan editor (and, later, the daily log).
// `onPick(foodId, servings)` fires on confirm; `onClose()` on backdrop tap or Escape.
export function FoodPicker(onPick, onClose) {
  return {
    setup() {
      const q = ref('');
      const chosen = ref(null);
      const servings = ref(1);

      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      onMounted(() => {
        if (!data.foods.length) loadFoods();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
      });
      onUnmounted(() => {
        document.removeEventListener('keydown', onKey);
        document.body.style.overflow = '';
      });

      const results = computed(() => {
        const term = q.value.trim().toLowerCase();
        return data.foods
          .filter((f) => f.name.toLowerCase().includes(term))
          .slice(0, 60);
      });
      const preview = computed(() => itemMacros(chosen.value, servings.value));

      const bump = (delta) => {
        const next = Math.round((Number(servings.value) + delta) * 100) / 100;
        servings.value = Math.max(STEP, next);
      };

      const confirm = () => {
        const n = Number(servings.value);
        if (!chosen.value || !(n > 0)) return;
        onPick(chosen.value.id, n);
      };

      return () => h('div', {
        class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Add food',
        onClick: (e) => { if (e.target.classList.contains('modal')) onClose(); },
      }, [
        h('div', { class: 'sheet' }, [
          h('div', { class: 'sheet-grip' }),
          h('div', { class: 'sheet-head' }, [
            h('h2', 'Add food'),
            h('button', { class: 'icon-btn', 'aria-label': 'Close', onClick: onClose }, icon('close', 20)),
          ]),
          h('div', { class: 'searchbar' }, [
            icon('search', 18),
            h('input', {
              class: 'field', type: 'search', placeholder: 'Search food',
              'aria-label': 'Search food', enterkeyhint: 'search', autofocus: true,
              value: q.value, onInput: (e) => (q.value = e.target.value),
            }),
          ]),

          results.value.length
            ? h('ul', { class: 'pick-list' }, results.value.map((f) =>
                h('li', {
                  key: f.id,
                  class: chosen.value?.id === f.id ? 'is-sel' : '',
                  'aria-selected': chosen.value?.id === f.id,
                  onClick: () => (chosen.value = f),
                }, [
                  h('div', { class: 'pick-name' }, f.name),
                  h('div', { class: ['pick-cat', f.category] }, CAT_LABEL[f.category]),
                  h('div', { class: 'pick-sub' },
                    `${f.serving_label} · ${f.calories} cal · P${f.protein} F${f.fat} C${f.carb}`),
                ])
              ))
            : h('div', { class: 'empty' }, [
                h('strong', 'Nothing found'),
                'Add it under Library first.',
              ]),

          chosen.value ? h('div', { class: 'confirm-bar' }, [
            h('div', { class: 'confirm-top' }, [
              h('div', {}, [
                h('div', { class: 'confirm-name' }, chosen.value.name),
                h('div', { class: 'pick-sub' }, `${preview.value.calories} cal`),
              ]),
              macroChips(preview.value),
            ]),
            h('div', { class: 'confirm-top' }, [
              h('div', { class: 'stepper' }, [
                h('button', { 'aria-label': 'Fewer servings', onClick: () => bump(-STEP) }, icon('minus', 16)),
                h('input', {
                  type: 'number', step: String(STEP), min: '0', inputmode: 'decimal',
                  'aria-label': 'Servings',
                  value: servings.value, onInput: (e) => (servings.value = e.target.value),
                }),
                h('button', { 'aria-label': 'More servings', onClick: () => bump(STEP) }, icon('plus', 16)),
              ]),
              h('button', { class: 'btn btn-primary', onClick: confirm }, [icon('check', 18), 'Add']),
            ]),
          ]) : null,
        ]),
      ]);
    },
  };
}
