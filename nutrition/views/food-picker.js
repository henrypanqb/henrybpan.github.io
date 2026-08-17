const { ref, computed, h, onMounted } = Vue;
import { data, loadFoods } from '../store.js';
import { itemMacros } from '../calc.js';

// Bottom-sheet food picker shared by the plan editor (and, later, the daily log).
// `onPick(foodId, servings)` fires on confirm; `onClose()` on backdrop tap.
export function FoodPicker(onPick, onClose) {
  return {
    setup() {
      const q = ref('');
      const chosen = ref(null);
      const servings = ref(1);

      onMounted(() => { if (!data.foods.length) loadFoods(); });

      const results = computed(() => {
        const term = q.value.trim().toLowerCase();
        return data.foods
          .filter((f) => f.name.toLowerCase().includes(term))
          .slice(0, 40);
      });
      const preview = computed(() => itemMacros(chosen.value, servings.value));

      const confirm = () => {
        const n = Number(servings.value);
        if (!chosen.value || !(n > 0)) return;
        onPick(chosen.value.id, n);
      };

      return () => h('div', {
        class: 'modal',
        onClick: (e) => { if (e.target.classList.contains('modal')) onClose(); },
      }, [
        h('div', { class: 'sheet' }, [
          h('input', {
            class: 'search', type: 'search', placeholder: 'Search food',
            value: q.value, onInput: (e) => (q.value = e.target.value),
          }),
          h('ul', { class: 'pick-list' }, results.value.map((f) =>
            h('li', {
              key: f.id,
              class: chosen.value?.id === f.id ? 'is-sel' : '',
              onClick: () => (chosen.value = f),
            }, `${f.name} · ${f.serving_label}`)
          )),
          chosen.value ? h('div', { class: 'servings' }, [
            h('label', 'Servings'),
            h('input', {
              type: 'number', step: '0.05', min: '0', inputmode: 'decimal',
              value: servings.value, onInput: (e) => (servings.value = e.target.value),
            }),
            h('span', { class: 'num' },
              `${preview.value.calories} cal · P${preview.value.protein} F${preview.value.fat} C${preview.value.carb}`),
            h('button', { class: 'primary-btn', onClick: confirm }, 'Add'),
          ]) : null,
        ]),
      ]);
    },
  };
}
