import { $, esc } from '../dom.js';

export function toast(msg, { action, onAction, ms = 0 } = {}) {
  const box = $('#toast');
  box.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="btn" type="button">${esc(action)}</button>` : ''}`;
  box.hidden = false;
  $('button', box)?.addEventListener('click', () => { box.hidden = true; onAction?.(); });
  if (ms) setTimeout(() => { box.hidden = true; }, ms);
}
