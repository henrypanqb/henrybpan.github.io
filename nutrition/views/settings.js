const { reactive, ref, h } = Vue;
import { getTargets, setTargets, signOut, state } from '../store.js';

const KEYS = ['calories', 'protein', 'fat', 'carb'];

export const Settings = {
  setup() {
    const t = reactive(getTargets());
    const saved = ref(false);

    const save = () => {
      setTargets({ ...t });
      saved.value = true;
      setTimeout(() => (saved.value = false), 1500);
    };

    const toggleTheme = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('theme', next);
    };

    const field = (k) => h('label', { class: 'set-row', key: k }, [
      h('span', k),
      h('input', {
        type: 'number', min: '0', inputmode: 'decimal', value: t[k],
        onInput: (e) => (t[k] = Number(e.target.value)),
        onChange: save,
      }),
    ]);

    return () => h('div', {}, [
      h('h1', 'Settings'),
      h('h2', { class: 'cat' }, 'Default daily targets'),
      h('p', { class: 'hint' }, 'Applied to plans you create from now on.'),
      ...KEYS.map(field),
      saved.value ? h('p', { class: 'hint' }, 'Saved.') : null,
      h('h2', { class: 'cat' }, 'App'),
      h('button', { class: 'add-btn', onClick: toggleTheme }, 'Toggle theme'),
      h('button', { class: 'add-btn', onClick: () => signOut() }, 'Sign out'),
      state.session?.user?.email
        ? h('p', { class: 'hint' }, `Signed in as ${state.session.user.email}`)
        : null,
    ]);
  },
};
