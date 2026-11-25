import { $, $$ } from '../dom.js';
import { getTheme, setTheme } from '../theme.js';
import { getUnit, setUnit, getWind, setWind } from '../units.js';
import { KEYS } from '../config.js';
import { readStr } from '../storage.js';
import { set } from '../state.js';
import { setCharts } from './sheet.js';
import { canInstall, onInstallChange, promptInstall } from '../pwa.js';

const current = { theme: getTheme, unit: getUnit, wind: getWind, charts: () => (readStr(KEYS.charts) !== 'false' ? 'on' : 'off') };
const apply = {
  theme: setTheme, unit: v => { setUnit(v); set({}); }, wind: v => { setWind(v); set({}); }, charts: v => setCharts(v === 'on'),
};
function sync() { $$('.seg').forEach(seg => $$('button', seg).forEach(b => b.setAttribute('aria-pressed', String(current[seg.dataset.key]() === b.dataset.v)))); }
$$('.seg').forEach(seg => seg.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  apply[seg.dataset.key](b.dataset.v); sync();
}));
const installRow = $('#installRow');
const syncInstall = () => { installRow.hidden = !canInstall(); };
onInstallChange(syncInstall);
$('#installBtn').addEventListener('click', promptInstall);
sync(); syncInstall();
