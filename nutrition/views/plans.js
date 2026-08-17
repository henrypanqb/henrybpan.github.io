const { ref, h, onMounted } = Vue;
import { data, loadPlans, createPlan } from '../store.js';

export const Plans = {
  setup() {
    const name = ref('');
    const busy = ref(false);

    onMounted(() => loadPlans());

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
          placeholder: 'New plan name', value: name.value,
          onInput: (e) => (name.value = e.target.value),
          onKeydown: (e) => { if (e.key === 'Enter') add(); },
        }),
        h('button', { class: 'primary-btn', disabled: busy.value, onClick: add }, 'Create'),
      ]),
      data.plans.length
        ? h('ul', { class: 'plan-list' }, data.plans.map((p) =>
            h('li', { key: p.id }, h('a', { href: `#/plans/${p.id}` }, p.name))))
        : h('p', { class: 'empty' }, 'No plans yet.'),
    ]);
  },
};
