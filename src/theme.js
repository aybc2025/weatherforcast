import { KEYS } from './config.js';
import { readStr, writeStr } from './storage.js';

const META = { dark: '#0A1424', light: '#F4F7FB' };
const mq = window.matchMedia('(prefers-color-scheme: dark)');
export const getTheme = () => (['light', 'dark'].includes(readStr(KEYS.theme)) ? readStr(KEYS.theme) : 'auto');

export function applyTheme() {
  const t = getTheme(), root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = t;
  const dark = t === 'dark' || (t === 'auto' && mq.matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? META.dark : META.light);
}
export function setTheme(t) { writeStr(KEYS.theme, t); applyTheme(); }
mq.addEventListener('change', applyTheme);
