const { reactive, ref, h } = Vue;
import { getTargets, setTargets, signOut, state } from '../store.js';
import { icon } from '../icons.js';

const KEYS = [
  { k: 'calories', label: 'Calories' },
  { k: 'protein', label: 'Protein (g)' },
  { k: 'fat', label: 'Fat (g)' },
  { k: 'carb', label: 'Carbs (g)' },
];

export const Settings = {
  setup() {
    const t = reactive(getTargets());
    const saved = ref(false);
    let timer = null;

    const save = () => {
      setTargets({ ...t });
      saved.value = true;
      clearTimeout(timer);
      timer = setTimeout(() => (saved.value = false), 1800);
    };

    const field = ({ k, label }) => h('label', { class: 'set-row', key: k }, [
      h('span', label),
      h('input', {
        class: 'field', type: 'number', min: '0', inputmode: 'decimal', value: t[k],
        onInput: (e) => (t[k] = Number(e.target.value)),
        onChange: save,
      }),
    ]);

    return () => h('div', {}, [
      h('h1', 'Settings'),

      h('h2', { class: 'cat' }, 'Default daily targets'),
      h('p', { class: 'hint' }, 'Applied to plans you create from now on. Existing plans keep their own targets.'),
      ...KEYS.map(field),
      h('p', {
        class: 'hint',
        style: { color: saved.value ? 'var(--c-met)' : 'transparent' },
        'aria-live': 'polite',
      }, saved.value ? 'Saved' : ' '),

      h('h2', { class: 'cat' }, 'App'),
      h('div', { class: 'btn-row' }, [
        h('button', { class: 'btn btn-danger', onClick: () => signOut() }, [icon('logout', 18), 'Sign out']),
      ]),
      state.session?.user?.email
        ? h('p', { class: 'hint', style: { marginTop: '12px' } }, `Signed in as ${state.session.user.email}`)
        : null,
    ]);
  },
};
