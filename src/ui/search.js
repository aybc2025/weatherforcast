import { $, esc } from '../dom.js';
import { geocode, reverseGeocode } from '../api.js';
import { loadPlace } from '../load.js';
import { addRecent, getRecent, slim } from '../places.js';
import { toast } from './toast.js';

const input = $('#cityInput'), box = $('#suggestions'), recent = $('#recent'), locBtn = $('#locBtn');
let results = [], idx = -1;

function pick(p) {
  box.hidden = true; input.value = ''; results = [];
  addRecent(p); renderRecent(); loadPlace(p);
}
function show(list) {
  results = list; idx = -1;
  box.innerHTML = list.map((p, i) => `<button type="button" role="option" data-i="${i}">${esc(p.name)}<small>${esc([p.admin1, p.country].filter(Boolean).join(', '))}</small></button>`).join('');
  box.hidden = !list.length;
}
function renderRecent() {
  const list = getRecent();
  recent.hidden = !list.length;
  recent.innerHTML = list.map((p, i) => `<button class="chip" type="button" data-i="${i}">${esc(p.name)}</button>`).join('');
}
const lookup = async q => { try { return (await geocode(q)).results || []; } catch { return null; } };
let timer;
input.addEventListener('input', () => {
  clearTimeout(timer);
  const q = input.value.trim();
  if (q.length < 2) { box.hidden = true; return; }
  timer = setTimeout(async () => { const r = await lookup(q); if (r && input.value.trim() === q) show(r); }, 300);
});
input.addEventListener('keydown', async e => {
  const items = $('button', box) ? [...box.querySelectorAll('button')] : [];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!items.length) return;
    e.preventDefault();
    idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((b, i) => b.classList.toggle('on', i === idx));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (idx >= 0) return pick(results[idx]);
    const q = input.value.trim(); if (!q) return;
    const r = results.length ? results : await lookup(q);
    if (r === null) toast('שגיאת רשת, נסו שוב', { ms: 3000 }); else if (!r.length) toast('לא נמצאו תוצאות', { ms: 3000 }); else pick(r[0]);
  } else if (e.key === 'Escape') box.hidden = true;
});
box.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) pick(results[+b.dataset.i]); });
recent.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) pick(getRecent()[+b.dataset.i]); });
document.addEventListener('click', e => { if (!box.contains(e.target) && e.target !== input) box.hidden = true; });

locBtn.addEventListener('click', () => {
  if (!navigator.geolocation) return toast('הדפדפן לא תומך במיקום', { ms: 3000 });
  locBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    let place = { name: 'המיקום שלי', latitude: coords.latitude, longitude: coords.longitude };
    try { const r = (await reverseGeocode(coords.latitude, coords.longitude)).results?.[0]; if (r) place = { ...r, latitude: coords.latitude, longitude: coords.longitude }; } catch { /* keep generic name */ }
    locBtn.disabled = false; loadPlace(slim(place));
  }, () => { locBtn.disabled = false; toast('לא ניתן לקבל מיקום', { ms: 3000 }); }, { timeout: 10000 });
});
renderRecent();
