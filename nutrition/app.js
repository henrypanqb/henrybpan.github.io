const { createApp, reactive, computed, ref, h } = Vue;
import { state, initAuth, signIn, clearError } from './store.js';
import { isConfigured } from './supabase.js';
import { Library } from './views/library.js';
import { Plans } from './views/plans.js';
import { PlanDetail } from './views/plan-detail.js';
import { Settings } from './views/settings.js';

const route = reactive({ path: location.hash.slice(1) || '/plans' });
window.addEventListener('hashchange', () => {
  route.path = location.hash.slice(1) || '/plans';
});

const TABS = [
  { path: '/today', label: 'Today' },
  { path: '/plans', label: 'Plans' },
  { path: '/library', label: 'Library' },
  { path: '/settings', label: 'Settings' },
];

const SignIn = {
  setup() {
    const email = ref('');
    const sent = ref(false);
    const err = ref('');
    const busy = ref(false);

    const submit = async () => {
      const address = email.value.trim();
      if (!address) { err.value = 'Enter your email address.'; return; }
      err.value = '';
      busy.value = true;
      const { error } = await signIn(address);
      busy.value = false;
      if (error) err.value = error.message; else sent.value = true;
    };

    return () => h('div', { class: 'signin' }, sent.value
      ? [h('h1', 'FiveCode'), h('p', 'Check your email for a sign-in link.')]
      : [
          h('h1', 'FiveCode'),
          h('input', {
            type: 'email', placeholder: 'you@email.com', autocomplete: 'email',
            value: email.value, onInput: (e) => (email.value = e.target.value),
            onKeydown: (e) => { if (e.key === 'Enter') submit(); },
          }),
          h('button', { disabled: busy.value, onClick: submit },
            busy.value ? 'Sending…' : 'Send magic link'),
          err.value ? h('p', { class: 'err' }, err.value) : null,
        ]);
  },
};

const planId = computed(() => (route.path.match(/^\/plans\/(.+)$/) || [])[1]);

function currentView() {
  const path = route.path;
  if (planId.value) return h(PlanDetail(planId.value), { key: planId.value });
  if (path.startsWith('/library')) return h(Library);
  if (path.startsWith('/settings')) return h(Settings);
  if (path.startsWith('/today')) {
    return h('p', { class: 'empty' }, 'The daily log lands in Phase 2.');
  }
  return h(Plans);
}

const App = {
  setup() {
    const activeTab = computed(() =>
      TABS.find((t) => route.path.startsWith(t.path))?.path ?? '/plans');

    return () => {
      if (!isConfigured) {
        return h('div', { class: 'signin' }, [
          h('h1', 'FiveCode'),
          h('p', { class: 'err' },
            'Supabase is not configured. Fill in nutrition/config.js with the project URL and anon key.'),
        ]);
      }
      if (!state.ready) return h('div', { class: 'view' }, 'Loading…');
      if (!state.session) return h(SignIn);

      return h('div', { class: 'app' }, [
        state.error
          ? h('div', { class: 'banner', onClick: clearError }, state.error)
          : null,
        h('main', { class: 'view' }, currentView()),
        h('nav', { class: 'tabbar' }, TABS.map((t) =>
          h('a', {
            key: t.path, href: '#' + t.path,
            class: ['tab', activeTab.value === t.path ? 'is-active' : ''],
          }, t.label)
        )),
      ]);
    };
  },
};

await initAuth();
createApp(App).mount('#app');
