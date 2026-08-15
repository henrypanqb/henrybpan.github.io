const { createApp, reactive, computed, h } = Vue;

const route = reactive({ path: location.hash.slice(1) || '/plans' });
window.addEventListener('hashchange', () => { route.path = location.hash.slice(1) || '/plans'; });

const App = {
  setup() {
    const tabs = [
      { path: '/today', label: 'Today' },
      { path: '/plans', label: 'Plans' },
      { path: '/library', label: 'Library' },
      { path: '/settings', label: 'Settings' },
    ];
    const active = computed(() => route.path);
    return () => h('div', { class: 'app' }, [
      h('main', { class: 'view' }, `Route: ${active.value}`),
      h('nav', { class: 'tabbar' }, tabs.map(t =>
        h('a', { href: '#' + t.path, class: ['tab', active.value.startsWith(t.path) ? 'is-active' : ''] }, t.label)
      )),
    ]);
  },
};

createApp(App).mount('#app');
