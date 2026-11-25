import { $, esc } from '../dom.js';
import { icon } from '../icons.js';
import { subscribe } from '../state.js';
import { loadPlace, warmCache } from '../load.js';
import { getFavs, isDefault, setDefault, removeFav, titleOf, readCache, placeId } from '../places.js';
import { describe } from '../wmo.js';
import { tempStr } from '../units.js';
import { showView } from './nav.js';

const root = $('#favList'), editBtn = $('#favEdit');
let editing = false;

function card(p) {
  const c = readCache(p)?.data?.current, d = c ? describe(c.weather_code, !!c.is_day) : null, def = isDefault(p);
  return `<li class="fav-card ${def ? 'is-default' : ''}" data-id="${placeId(p)}">
    <button class="fav-card__main" type="button" data-act="open">${d ? icon(d.icon, 'ico--l') : ''}<span class="fav-card__text"><span class="fav-card__name">${esc(titleOf(p))}</span><span class="meta muted">${d ? d.label : 'אין נתונים'}${def ? ' · ברירת מחדל' : ''}</span></span>
      <span class="fav-card__t num">${c ? tempStr(c.temperature_2m) : ''}</span></button>
    ${editing ? `<div class="fav-card__actions"><button class="btn btn--quiet" type="button" data-act="def">${def ? 'בטל ברירת מחדל' : 'ברירת מחדל'}</button><button class="btn btn--danger" type="button" data-act="del">הסר</button></div>` : ''}
  </li>`;
}
export function renderFavs() {
  const list = getFavs();
  editBtn.hidden = !list.length;
  editBtn.textContent = editing ? 'סיום' : 'עריכה';
  root.innerHTML = list.length ? list.map(card).join('') : `<li class="empty">${icon('star', 'ico--xl')}<p>אין מועדפים עדיין</p><p class="meta">לחצו על הכוכב בכרטיס העיר כדי לשמור</p></li>`;
}
export async function refreshFavs() {
  const list = getFavs().slice(0, 8);
  for (const p of list) { await warmCache(p); if (!$('#view-favs').hidden) renderFavs(); }
}
root.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const p = getFavs().find(f => placeId(f) === b.closest('.fav-card').dataset.id); if (!p) return;
  if (b.dataset.act === 'open') { showView('home'); loadPlace(p); }
  else if (b.dataset.act === 'def') { setDefault(isDefault(p) ? null : p); renderFavs(); }
  else if (b.dataset.act === 'del') { removeFav(p); renderFavs(); }
});
editBtn.addEventListener('click', () => { editing = !editing; renderFavs(); });
subscribe(() => { if (!$('#view-favs').hidden) renderFavs(); });
