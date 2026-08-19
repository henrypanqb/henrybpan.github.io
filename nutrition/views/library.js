const { computed, ref, h, onMounted } = Vue;
import { data, loadFoods, addFood, updateFood } from '../store.js';
import { icon } from '../icons.js';
import { macroChips } from './macro-chips.js';

const CATS = [
  { key: 'protein', label: 'Protein' },
  { key: 'fat', label: 'Fat' },
  { key: 'carb', label: 'Carbs' },
];
const BLANK = { name: '', category: 'protein', serving_label: '', calories: 0, protein: 0, fat: 0, carb: 0 };

export const Library = {
  setup() {
    const q = ref('');
    const draft = ref(null);
    const editingId = ref(null);
    const saving = ref(false);
    const loading = ref(true);

    onMounted(async () => {
      if (!data.foods.length) await loadFoods();
      loading.value = false;
    });

    const filtered = computed(() => {
      const term = q.value.trim().toLowerCase();
      return CATS.map((c) => ({
        ...c,
        items: data.foods.filter(
          (f) => f.category === c.key && f.name.toLowerCase().includes(term)
        ),
      }));
    });

    const totalShown = computed(() => filtered.value.reduce((n, g) => n + g.items.length, 0));

    const startAdd = () => { editingId.value = null; draft.value = { ...BLANK }; };
    const startEdit = (food) => {
      editingId.value = food.id;
      draft.value = { ...food };
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const cancel = () => { draft.value = null; editingId.value = null; };

    const save = async () => {
      const d = draft.value;
      if (!d.name.trim() || !d.serving_label.trim()) return;
      saving.value = true;
      const payload = {
        name: d.name.trim(), category: d.category, serving_label: d.serving_label.trim(),
        calories: Number(d.calories) || 0, protein: Number(d.protein) || 0,
        fat: Number(d.fat) || 0, carb: Number(d.carb) || 0,
      };
      const { error } = editingId.value
        ? await updateFood(editingId.value, payload)
        : await addFood(payload);
      saving.value = false;
      if (!error) cancel();
    };

    return () => {
      if (loading.value) {
        return h('div', {}, [
          h('h1', 'Library'),
          h('div', { class: 'skel' }, [1, 2, 3, 4, 5, 6].map((n) => h('div', { class: 'skel-row', key: n }))),
        ]);
      }

      return h('div', {}, [
        h('h1', 'Library'),
        h('div', { class: 'searchbar' }, [
          icon('search', 18),
          h('input', {
            class: 'field', type: 'search', placeholder: 'Search foods',
            'aria-label': 'Search foods', enterkeyhint: 'search',
            value: q.value, onInput: (e) => (q.value = e.target.value),
          }),
        ]),
        draft.value
          ? foodForm(draft, save, cancel, saving.value, !!editingId.value)
          : h('button', { class: 'btn btn-block', onClick: startAdd }, [icon('plus', 18), 'Add food']),

        q.value.trim() && totalShown.value === 0
          ? h('div', { class: 'empty' }, [
              h('strong', `No food matches “${q.value.trim()}”`),
              'Try a shorter search, or add it as a custom food.',
            ])
          : null,

        ...filtered.value
          .filter((g) => g.items.length)
          .map((group) =>
            h('section', { key: group.key }, [
              h('h2', { class: 'cat' }, [group.label, h('span', { class: 'cat-n' }, group.items.length)]),
              h('ul', { class: 'food-list' }, group.items.map((f) =>
                h('li', {
                  key: f.id, tabindex: '0', role: 'button',
                  'aria-label': `Edit ${f.name}`,
                  onClick: () => startEdit(f),
                  onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit(f); } },
                }, [
                  h('div', {}, [
                    h('div', { class: 'food-name' }, f.name),
                    h('div', { class: 'food-serving' }, f.serving_label),
                  ]),
                  h('div', { class: 'food-cal' }, `${f.calories} cal`),
                  macroChips(f),
                ])
              )),
            ])
          ),
      ]);
    };
  },
};

function foodForm(draft, save, cancel, saving, isEdit) {
  const field = (k, type, label, extra = {}) => h('label', { class: 'set-row' }, [
    h('span', label),
    h('input', {
      class: 'field', type,
      inputmode: type === 'number' ? 'decimal' : undefined,
      value: draft.value[k],
      onInput: (e) => (draft.value[k] = type === 'number' ? Number(e.target.value) : e.target.value),
      ...extra,
    }),
  ]);

  return h('div', { class: 'food-form' }, [
    h('h2', isEdit ? 'Edit food' : 'New food'),
    field('name', 'text', 'Name'),
    h('label', { class: 'set-row' }, [
      h('span', 'Category'),
      h('select', {
        class: 'field',
        value: draft.value.category,
        onChange: (e) => (draft.value.category = e.target.value),
      }, CATS.map((c) => h('option', { value: c.key, key: c.key }, c.label))),
    ]),
    field('serving_label', 'text', 'Serving', { placeholder: 'e.g. 200g, 2 eggs' }),
    field('calories', 'number', 'Calories'),
    field('protein', 'number', 'Protein (g)'),
    field('fat', 'number', 'Fat (g)'),
    field('carb', 'number', 'Carbs (g)'),
    h('div', { class: 'btn-row' }, [
      h('button', { class: 'btn', onClick: cancel }, 'Cancel'),
      h('button', { class: 'btn btn-primary', disabled: saving, onClick: save },
        saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add food'),
    ]),
  ]);
}
