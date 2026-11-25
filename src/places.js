import { KEYS, MAX_RECENT } from './config.js';
import { readJson, writeJson, readStr, writeStr, removeKey } from './storage.js';

export const placeId = p => `${(+p.latitude).toFixed(4)},${(+p.longitude).toFixed(4)}`;
export const slim = p => ({ name: p.name, admin1: p.admin1 || '', country: p.country || '', latitude: +p.latitude, longitude: +p.longitude });
export const titleOf = p => [p.name, p.admin1, p.country].filter(Boolean).join(', ');

export const getFavs = () => readJson(KEYS.favs, []);
export const isFav = p => getFavs().some(f => placeId(f) === placeId(p));
export function toggleFav(p) {
  const list = getFavs(), id = placeId(p), i = list.findIndex(f => placeId(f) === id);
  if (i >= 0) { list.splice(i, 1); if (isDefault(p)) setDefault(null); } else list.push(slim(p));
  writeJson(KEYS.favs, list);
  return i < 0;
}
export const removeFav = p => { if (isFav(p)) toggleFav(p); };
export const isDefault = p => readStr(KEYS.def) === placeId(p);
export const setDefault = p => (p ? writeStr(KEYS.def, placeId(p)) : removeKey(KEYS.def));
export const getDefault = () => getFavs().find(isDefault) || null;

export const getRecent = () => readJson(KEYS.recent, []);
export function addRecent(p) {
  const list = [slim(p), ...getRecent().filter(r => placeId(r) !== placeId(p))].slice(0, MAX_RECENT);
  writeJson(KEYS.recent, list);
}
export const getLastPlace = () => readJson(KEYS.lastPlace, null);
export const setLastPlace = p => writeJson(KEYS.lastPlace, slim(p));
export const readCache = p => readJson(KEYS.last(placeId(p)), null);
