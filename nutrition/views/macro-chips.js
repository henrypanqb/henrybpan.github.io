const { h } = Vue;

// Shared macro readout. Colour is always paired with a text label so the
// information never depends on colour alone.
export function macroChips(m) {
  const chip = (cls, label, value) => h('span', { class: ['macro', cls] }, [
    h('span', { class: 'macro-k' }, label),
    h('span', { class: 'macro-v' }, value),
  ]);
  return h('div', { class: 'macros' }, [
    chip('p', 'P', m.protein),
    chip('f', 'F', m.fat),
    chip('c', 'C', m.carb),
  ]);
}
