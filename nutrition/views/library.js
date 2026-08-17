const { computed, ref, h, onMounted } = Vue;
import { data, loadFoods, addFood, updateFood } from '../store.js';

const CATS = ['protein', 'fat', 'carb'];
const BLANK = { name: '', category: 'protein', serving_label: '', calories: 0, protein: 0, fat: 0, carb: 0 };

export const Library = {
  setup() {
    const q = ref('');
    const draft = ref(null);
    const editingId = ref(null);
    const saving = ref(false);

    onMounted(() => { if (!data.foods.length) loadFoods(); });

    const filtered = computed(() => {
      const term = q.value.trim().toLowerCase();
      return CATS.map((cat) => ({
        cat,
        items: data.foods.filter(
          (f) => f.category === cat && f.name.toLowerCase().includes(term)
        ),
      })).filter((g) => g.items.length || !term);
    });

    const startAdd = () => { editingId.value = null; draft.value = { ...BLANK }; };
    const startEdit = (food) => { editingId.value = food.id; draft.value = { ...food }; };
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

    return () => h('div', {}, [
      h('h1', 'Library'),
      h('input', {
        class: 'search', type: 'search', placeholder: 'Search foods',
        value: q.value, onInput: (e) => (q.value = e.target.value),
      }),
      draft.value
        ? foodForm(draft, save, cancel, saving.value, !!editingId.value)
        : h('button', { class: 'add-btn', onClick: startAdd }, '+ Add food'),
      ...filtered.value.map((group) =>
        h('section', { key: group.cat }, [
          h('h2', { class: 'cat' }, group.cat),
          h('ul', { class: 'food-list' }, group.items.map((f) =>
            h('li', { key: f.id, onClick: () => startEdit(f) }, [
              h('span', { class: 'food-name' }, `${f.name} · ${f.serving_label}`),
              h('span', { class: 'num' },
                `${f.calories} cal · P${f.protein} F${f.fat} C${f.carb}`),
            ])
          )),
        ])
      ),
    ]);
  },
};

function foodForm(draft, save, cancel, saving, isEdit) {
  const field = (k, type, label) => h('label', { class: 'set-row' }, [
    h('span', label),
    h('input', {
      type, value: draft.value[k], inputmode: type === 'number' ? 'decimal' : undefined,
      onInput: (e) => (draft.value[k] = type === 'number' ? Number(e.target.value) : e.target.value),
    }),
  ]);
  return h('div', { class: 'food-form' }, [
    field('name', 'text', 'name'),
    h('label', { class: 'set-row' }, [
      h('span', 'category'),
      h('select', {
        value: draft.value.category,
        onChange: (e) => (draft.value.category = e.target.value),
      }, ['protein', 'fat', 'carb'].map((c) => h('option', { value: c, key: c }, c))),
    ]),
    field('serving_label', 'text', 'serving'),
    field('calories', 'number', 'calories'),
    field('protein', 'number', 'protein'),
    field('fat', 'number', 'fat'),
    field('carb', 'number', 'carb'),
    h('div', { class: 'form-actions' }, [
      h('button', { class: 'add-btn', onClick: cancel }, 'Cancel'),
      h('button', { class: 'primary-btn', disabled: saving, onClick: save },
        saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add food'),
    ]),
  ]);
}
