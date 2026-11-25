import { $, $$ } from '../dom.js';
const listeners = [];
export const onView = fn => listeners.push(fn);
export function showView(name) {
  $$('.view').forEach(v => { v.hidden = v.id !== `view-${name}`; });
  $$('.tabbar button').forEach(b => (b.dataset.view === name ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  listeners.forEach(fn => fn(name));
  window.scrollTo(0, 0);
}
$$('.tabbar button').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
