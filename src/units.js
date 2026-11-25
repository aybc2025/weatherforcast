import { KEYS } from './config.js';
import { readStr, writeStr } from './storage.js';

let unit = readStr(KEYS.unit) === 'F' ? 'F' : 'C';
let wind = readStr(KEYS.wind) === 'mph' ? 'mph' : 'kmh';
export const getUnit = () => unit;
export const getWind = () => wind;
export const setUnit = u => { unit = u === 'F' ? 'F' : 'C'; writeStr(KEYS.unit, unit); };
export const setWind = w => { wind = w === 'mph' ? 'mph' : 'kmh'; writeStr(KEYS.wind, wind); };
export const temp = c => Math.round(unit === 'F' ? c * 9 / 5 + 32 : c) + 0;
export const tempStr = c => `${temp(c)}°`;
export const windStr = kmh => (wind === 'mph' ? `${Math.round(kmh * 0.621371)} mph` : `${Math.round(kmh)} קמ״ש`);
export const mmStr = mm => `${Math.round(mm * 10) / 10} מ״מ`;
