import { esc } from '../dom.js';
import { icon } from '../icons.js';
import { describe } from '../wmo.js';
import { tempStr, temp, getUnit, windStr } from '../units.js';
import { hm, dateOf, weekday, dayMonth, agoText } from '../time.js';
import { titleOf, isFav } from '../places.js';

// --- derived helpers -------------------------------------------------------
export function isDayAt(data, iso) {
  const i = data.daily.time.indexOf(dateOf(iso));
  if (i < 0) return true;
  const t = hm(iso);
  return t >= hm(data.daily.sunrise[i]) && t < hm(data.daily.sunset[i]);
}
export const nowIndex = data => Math.max(0, data.hourly.time.findIndex(t => t.slice(0, 13) === data.current.time.slice(0, 13)));

// --- hero ------------------------------------------------------------------
export function heroHtml(s) {
  const { data, place } = s, c = data.current, d = describe(c.weather_code, !!c.is_day);
  const busy = s.status === 'refreshing';
  return `<section class="hero hero--${d.hero}" aria-label="מזג אוויר נוכחי">
    <div class="hero__top"><h2 class="hero__place">${esc(titleOf(place))}</h2>
      <button class="icon-btn" type="button" data-act="fav" aria-pressed="${isFav(place)}" aria-label="מועדף">${icon('star', isFav(place) ? 'ico--fill' : '')}</button></div>
    <div class="hero__main"><div class="hero__temp num">${temp(c.temperature_2m)}<small>°${getUnit()}</small></div>${icon(d.icon, 'ico--xl')}</div>
    <p class="hero__cond">${d.label}</p>
    <p class="hero__meta">גבוה ${tempStr(data.daily.temperature_2m_max[0])} · נמוך ${tempStr(data.daily.temperature_2m_min[0])} · מרגיש כמו ${tempStr(c.apparent_temperature)}</p>
    <p class="hero__upd"><button class="icon-btn ${busy ? 'spin' : ''}" type="button" data-act="refresh" aria-label="רענון">${icon('refresh', 'ico--s')}</button>עודכן ${agoText(s.savedAt)}</p>
  </section>`;
}

// --- next 24 hours ---------------------------------------------------------
export function stripHtml({ data }) {
  const h = data.hourly, from = nowIndex(data), items = [];
  for (let i = from; i < Math.min(from + 24, h.time.length); i++) {
    const pop = h.precipitation_probability[i] ?? 0;
    items.push(`<button class="strip__item ${i === from ? 'now' : ''}" type="button" data-act="day" data-date="${dateOf(h.time[i])}">
      <span class="num">${i === from ? 'עכשיו' : hm(h.time[i])}</span>${icon(describe(h.weather_code[i], isDayAt(data, h.time[i])).icon)}
      <b class="num">${tempStr(h.temperature_2m[i])}</b><span class="pop num">${pop >= 20 ? pop + '%' : ''}</span></button>`);
  }
  return `<section class="sec"><h3 class="sec__title">24 השעות הקרובות</h3><div class="strip">${items.join('')}</div></section>`;
}

// --- 7 days ----------------------------------------------------------------
export function dailyHtml({ data }) {
  const d = data.daily, lo = Math.min(...d.temperature_2m_min), hi = Math.max(...d.temperature_2m_max), span = hi - lo || 1;
  const rows = d.time.map((date, i) => {
    const l = ((d.temperature_2m_min[i] - lo) / span) * 100, w = ((d.temperature_2m_max[i] - d.temperature_2m_min[i]) / span) * 100;
    const name = i === 0 ? 'היום' : i === 1 ? 'מחר' : weekday(date);
    const pop = d.precipitation_probability_max[i];
    return `<button class="day" type="button" data-act="day" data-date="${date}">
      <span class="day__name">${name}<small class="num">${pop >= 20 ? 'גשם ' + pop + '%' : dayMonth(date)}</small></span>
      ${icon(describe(d.weather_code[i]).icon, 'ico--s')}
      <span class="day__range" style="--lo:${l.toFixed(1)}%;--w:${Math.max(w, 6).toFixed(1)}%"><i></i></span>
      <span class="day__temps num"><span>${tempStr(d.temperature_2m_max[i])}</span><span>${tempStr(d.temperature_2m_min[i])}</span></span></button>`;
  });
  return `<section class="sec"><h3 class="sec__title">תחזית 7 ימים</h3>${rows.join('')}</section>`;
}

// --- detail tiles + air quality -------------------------------------------
const uvLabel = v => (v < 3 ? 'נמוך' : v < 6 ? 'בינוני' : v < 8 ? 'גבוה' : 'גבוה מאוד');
const aqiBand = v => (v <= 20 ? ['טובה', 'good'] : v <= 40 ? ['הוגנת', 'good'] : v <= 60 ? ['בינונית', 'mid'] : v <= 80 ? ['גרועה', 'bad'] : ['גרועה מאוד', 'bad']);
const tile = (ic, label, val, sub = '') => `<div class="tile"><div class="tile__label">${icon(ic, 'ico--s')}${label}</div><div class="tile__val num">${val}</div><div class="tile__sub">${sub}</div></div>`;

export function tilesHtml({ data, air }) {
  const c = data.current, h = data.hourly, i = nowIndex(data), d = data.daily;
  const uv = Math.round(h.uv_index[i] ?? 0), vis = h.visibility[i];
  const out = [
    tile('drop', 'לחות', `${Math.round(c.relative_humidity_2m)}%`),
    tile('wind', 'רוח', windStr(c.wind_speed_10m), `${Math.round(c.wind_direction_10m)}°`),
    tile('sun', 'מדד UV', uv, uvLabel(uv)),
    tile('gauge', 'לחץ', `${Math.round(c.surface_pressure)}`, 'hPa'),
    tile('eye', 'ראות', vis == null ? '—' : `${Math.round(vis / 100) / 10}`, 'ק״מ'),
    tile('umbrella', 'סיכוי משקעים', `${h.precipitation_probability[i] ?? 0}%`),
    tile('sunrise', 'זריחה', hm(d.sunrise[0]), data.timezone),
    tile('sunset', 'שקיעה', hm(d.sunset[0]), data.timezone),
  ];
  const aqi = air?.current?.european_aqi;
  if (aqi != null) {
    const [label, kind] = aqiBand(aqi);
    out.push(`<div class="tile tile--wide"><div class="tile__label">${icon('leaf', 'ico--s')}איכות אוויר</div>
      <div class="tile__val num">${Math.round(aqi)} · ${label}</div>
      <div class="aqi__bar"><i style="--w:${Math.min(100, aqi)}%;--c:var(--aqi-${kind})"></i></div></div>`);
  }
  return `<section class="tiles" aria-label="פירוט">${out.join('')}</section>`;
}
