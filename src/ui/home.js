import { $ } from '../dom.js';
import { icon } from '../icons.js';
import { get, subscribe } from '../state.js';
import { loadPlace, refresh } from '../load.js';
import { toggleFav } from '../places.js';
import { agoText } from '../time.js';
import { heroHtml, stripHtml, dailyHtml, tilesHtml } from './sections.js';
import { openDay } from './sheet.js';

const root = $('#home'), banner = $('#banner');
let lastNonce = 0;

function view(s) {
  if (s.data) return [heroHtml(s), stripHtml(s), dailyHtml(s), tilesHtml(s)];
  if (s.status === 'loading') return ['<div class="skeleton skeleton--hero"></div>', '<div class="skeleton skeleton--sec"></div>'];
  if (s.status === 'error') return [];
  return [`<div class="empty">${icon('cloud-sun', 'ico--xl')}<p>חפשו עיר או לחצו על סמל המיקום</p></div>`];
}
function bannerHtml(s) {
  if (s.status === 'error') return '<div class="banner banner--err"><span>לא ניתן לטעון תחזית</span><button class="btn btn--quiet" type="button" data-act="retry">נסו שוב</button></div>';
  if (s.offline && s.data) return `<div class="banner">אין חיבור · מוצגת תחזית שנשמרה ${agoText(s.savedAt)}</div>`;
  return '';
}
function render(s) {
  banner.innerHTML = bannerHtml(s);
  root.innerHTML = view(s).map((h, i) => `<div style="--i:${i}">${h}</div>`).join('');
  if (s.event.nonce !== lastNonce) {
    lastNonce = s.event.nonce;
    if (s.event.kind === 'loaded' && s.data) { root.classList.add('enter'); root.addEventListener('animationend', () => root.classList.remove('enter'), { once: true }); }
  }
}
root.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const s = get();
  if (b.dataset.act === 'day') openDay(b.dataset.date);
  else if (b.dataset.act === 'refresh') refresh();
  else if (b.dataset.act === 'fav' && s.place) { toggleFav(s.place); render(s); }
});
banner.addEventListener('click', e => { if (e.target.closest('[data-act="retry"]')) loadPlace(get().place); });
subscribe(render);
render(get());
