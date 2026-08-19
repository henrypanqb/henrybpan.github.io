const { ref, h, onMounted } = Vue;
import { data, loadPlans, createPlan } from '../store.js';
import { icon } from '../icons.js';

export const Plans = {
  setup() {
    const name = ref('');
    const busy = ref(false);
    const loading = ref(true);

    onMounted(async () => { await loadPlans(); loading.value = false; });

    const add = async () => {
      const trimmed = name.value.trim();
      if (!trimmed || busy.value) return;
      busy.value = true;
      const { error } = await createPlan(trimmed);
      busy.value = false;
      if (!error) name.value = '';
    };

    return () => h('div', {}, [
      h('h1', 'Plans'),
      h('div', { class: 'new-plan' }, [
        h('input', {
          class: 'field', placeholder: 'New plan name', 'aria-label': 'New plan name',
          enterkeyhint: 'done',
          value: name.value,
          onInput: (e) => (name.value = e.target.value),
          onKeydown: (e) => { if (e.key === 'Enter') add(); },
        }),
        h('button', {
          class: 'btn btn-primary', disabled: busy.value || !name.value.trim(), onClick: add,
        }, busy.value ? 'Creating…' : 'Create'),
      ]),

      loading.value
        ? h('div', { class: 'skel' }, [1, 2, 3].map((n) => h('div', { class: 'skel-row', key: n })))
        : data.plans.length
          ? h('ul', { class: 'plan-list' }, data.plans.map((p) =>
              h('li', { key: p.id }, h('a', { href: `#/plans/${p.id}` }, [
                h('span', p.name),
                icon('chevron', 16),
              ]))))
          : h('div', { class: 'empty' }, [
              h('strong', 'No plans yet'),
              'Name one above — it starts with Day 1 and three meals.',
            ]),
    ]);
  },
};
