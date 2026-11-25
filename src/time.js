// Forecast timestamps are local to the place ("2025-11-25T14:00"), so they are sliced, never run through Date().
export const hm = iso => iso.slice(11, 16);
export const dateOf = iso => iso.slice(0, 10);
const dt = d => { const [y, m, day] = d.split('-').map(Number); return new Date(y, m - 1, day); };
export const weekday = d => dt(d).toLocaleDateString('he-IL', { weekday: 'long' }).replace(/^יום /, '');
export const dayMonth = d => dt(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
export const longDate = d => dt(d).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
export function agoText(ms) {
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return 'הרגע';
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'לפני שעה' : `לפני ${h} שעות`;
  const d = Math.round(h / 24);
  return d === 1 ? 'אתמול' : `לפני ${d} ימים`;
}
