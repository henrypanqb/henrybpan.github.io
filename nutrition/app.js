const { createApp, reactive, computed, ref, h } = Vue;
import { state, initAuth, signIn, clearError } from './store.js';
import { isConfigured } from './supabase.js';
import { icon } from './icons.js';
import { Library } from './views/library.js';
import { Plans } from './views/plans.js';
import { PlanDetail } from './views/plan-detail.js';
import { Settings } from './views/settings.js';

const route = reactive({ path: location.hash.slice(1) || '/plans' });
window.addEventListener('hashchange', () => {
  route.path = location.hash.slice(1) || '/plans';
  window.scrollTo(0, 0);
});

const TABS = [
  { path: '/today', label: 'Today', ic: 'today' },
  { path: '/plans', label: 'Plans', ic: 'plans' },
  { path: '/library', label: 'Library', ic: 'library' },
  { path: '/settings', label: 'Settings', ic: 'settings' },
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
      ? [
          h('div', { class: 'signin-sent' }, [icon('mail', 32), h('strong', 'Check your email')]),
          h('p', { class: 'lead' }, `We sent a sign-in link to ${email.value.trim()}.`),
        ]
      : [
          h('h1', 'Nutrition Tracker'),
          h('p', { class: 'lead' }, 'Sign in with a magic link — no password.'),
          h('input', {
            class: 'field', type: 'email', placeholder: 'you@email.com',
            autocomplete: 'email', inputmode: 'email', enterkeyhint: 'go',
            'aria-label': 'Email address',
            value: email.value, onInput: (e) => (email.value = e.target.value),
            onKeydown: (e) => { if (e.key === 'Enter') submit(); },
          }),
          h('button', { class: 'btn btn-primary btn-block', disabled: busy.value, onClick: submit },
            busy.value ? 'Sending…' : 'Send magic link'),
          err.value ? h('p', { class: 'err', role: 'alert' }, err.value) : null,
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
    return h('div', {}, [
      h('h1', 'Today'),
      h('div', { class: 'empty' }, [
        h('strong', 'Not built yet'),
        'The daily log arrives in Phase 2. For now, build and check plans under Plans.',
      ]),
    ]);
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
          h('h1', 'Nutrition Tracker'),
          h('p', { class: 'err' },
            'Supabase is not configured. Fill in nutrition/config.js with the project URL and anon key.'),
        ]);
      }
      if (!state.ready) {
        return h('div', { class: 'app' },
          h('main', { class: 'view' },
            h('div', { class: 'skel' }, [1, 2, 3, 4].map((n) => h('div', { class: 'skel-row', key: n })))));
      }
      if (!state.session) return h(SignIn);

      return h('div', { class: 'app' }, [
        state.error
          ? h('div', {
              class: 'banner', role: 'alert', onClick: clearError,
              title: 'Dismiss',
            }, [icon('close', 16), h('span', state.error)])
          : null,
        h('main', { class: 'view' }, currentView()),
        h('nav', { class: 'tabbar', 'aria-label': 'Main' }, TABS.map((t) =>
          h('a', {
            key: t.path, href: '#' + t.path,
            class: ['tab', activeTab.value === t.path ? 'is-active' : ''],
            'aria-current': activeTab.value === t.path ? 'page' : undefined,
          }, [icon(t.ic, 22), h('span', t.label)])
        )),
      ]);
    };
  },
};

await initAuth();
createApp(App).mount('#app');
