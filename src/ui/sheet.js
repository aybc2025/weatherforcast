import { $, esc } from '../dom.js';
import { icon } from '../icons.js';
import { KEYS } from '../config.js';
import { readStr, writeStr } from '../storage.js';
import { get } from '../state.js';
import { describe } from '../wmo.js';
import { temp, tempStr, windStr } from '../units.js';
import { hm, dateOf, longDate } from '../time.js';
import { isDayAt } from './sections.js';
import { drawLine, chartColors } from './charts.js';

const dlg = $('#sheet');
let ro = null, current = null;

function rowsFor(data, date) {
  const h = data.hourly, out = [];
  h.time.forEach((t, i) => { if (dateOf(t) === date) out.push(i); });
  return out;
}
function drawCharts() {
  if (!current || !dlg.open) return;
  const { data, idxs } = current, h = data.hourly, labels = idxs.map(i => hm(h.time[i])), { c1, c2 } = chartColors();
  const cT = $('#chartTemp'), cP = $('#chartPop'); if (!cT) return;
  drawLine(cT, labels, idxs.map(i => temp(h.temperature_2m[i])), { color: c1, fmt: v => v + '°' });
  drawLine(cP, labels, idxs.map(i => h.precipitation_probability[i] ?? 0), { color: c2, min: 0, max: 100, fmt: v => v + '%', fill: false });
}
export function openDay(date) {
  const { data } = get(); if (!data) return;
  const idxs = rowsFor(data, date), h = data.hourly, showCharts = readStr(KEYS.charts) !== 'false';
  current = { data, idxs };
  const rows = idxs.map(i => {
    const d = describe(h.weather_code[i], isDayAt(data, h.time[i]));
    return `<div class="hrow num"><span>${hm(h.time[i])}</span>${icon(d.icon, 'ico--s')}<b>${tempStr(h.temperature_2m[i])}</b><span>${h.precipitation_probability[i] ?? 0}%</span><span>${windStr(h.wind_speed_10m[i])}</span><span>${Math.round(h.relative_humidity_2m[i])}%</span></div>`;
  }).join('');
  dlg.innerHTML = `<div class="sheet__head"><h2>${esc(longDate(date))}</h2><button class="icon-btn" type="button" data-close aria-label="סגירה">${icon('close')}</button></div>
    <div class="sheet__body">
      <div class="chart" ${showCharts ? '' : 'hidden'}><h3 class="sec__title">טמפרטורה</h3><canvas id="chartTemp" role="img" aria-label="גרף טמפרטורה לפי שעה"></canvas>
        <h3 class="sec__title">סיכוי משקעים</h3><canvas id="chartPop" role="img" aria-label="גרף סיכוי משקעים לפי שעה"></canvas></div>
      <div class="hrow hrow--head"><span>שעה</span><span></span><span>טמפ׳</span><span>גשם</span><span>רוח</span><span>לחות</span></div>${rows}
    </div>`;
  dlg.showModal();
  requestAnimationFrame(drawCharts);
  ro?.disconnect(); ro = new ResizeObserver(drawCharts); ro.observe(dlg);
}
dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
dlg.addEventListener('close', () => { ro?.disconnect(); ro = null; current = null; });
export const setCharts = on => writeStr(KEYS.charts, String(!!on));
