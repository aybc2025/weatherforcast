import { forecast, airQuality } from './api.js';
import { KEYS } from './config.js';
import { writeJson } from './storage.js';
import { get, set } from './state.js';
import { placeId, slim, readCache, setLastPlace } from './places.js';

// Show cached data instantly (if any), then refresh from the network.
export async function loadPlace(place, { quiet = false } = {}) {
  const p = slim(place);
  const cached = readCache(p);
  if (!quiet) {
    if (cached) set({ place: p, data: cached.data, air: cached.air, savedAt: cached.savedAt, status: 'refreshing', offline: false }, 'loaded');
    else set({ place: p, data: null, air: null, status: 'loading', offline: false }, 'loaded');
  } else set({ status: 'refreshing' });
  try {
    const [data, air] = await Promise.all([forecast(p.latitude, p.longitude), airQuality(p.latitude, p.longitude).catch(() => null)]);
    const savedAt = Date.now();
    writeJson(KEYS.last(placeId(p)), { data, air, savedAt });
    setLastPlace(p);
    if (placeId(get().place) !== placeId(p)) return; // user moved on while this was loading
    set({ place: p, data, air, savedAt, status: 'ready', offline: false }, quiet ? 'refreshed' : undefined);
  } catch {
    if (placeId(get().place) !== placeId(p)) return;
    if (get().data) set({ status: 'ready', offline: true });
    else set({ status: 'error', offline: true });
  }
}
export const refresh = () => { const { place } = get(); if (place) return loadPlace(place, { quiet: true }); };

// Fetch fresh data for a place into the cache only (used by the favorites screen).
export async function warmCache(p) {
  try {
    const [data, air] = await Promise.all([forecast(p.latitude, p.longitude), airQuality(p.latitude, p.longitude).catch(() => null)]);
    writeJson(KEYS.last(placeId(p)), { data, air, savedAt: Date.now() });
  } catch { /* keep whatever is cached */ }
}
