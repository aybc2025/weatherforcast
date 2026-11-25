import { API } from './config.js';

async function getJson(url, { timeout = 9000, retry = 1 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (attempt >= retry) throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}
const qs = o => new URLSearchParams(o).toString();

export const geocode = name => getJson(`${API.geo}?${qs({ name, count: 8, language: 'he', format: 'json' })}`, { retry: 0 });
export const reverseGeocode = (latitude, longitude) =>
  getJson(`${API.reverse}?${qs({ latitude, longitude, language: 'he', format: 'json' })}`, { retry: 0 });

export const forecast = (latitude, longitude) => getJson(`${API.forecast}?${qs({
  latitude, longitude, timezone: 'auto', forecast_days: 7,
  current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,is_day',
  hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,relative_humidity_2m,wind_speed_10m,uv_index,visibility',
  daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max',
})}`);

export const airQuality = (latitude, longitude) =>
  getJson(`${API.air}?${qs({ latitude, longitude, current: 'european_aqi,pm2_5', timezone: 'auto' })}`, { retry: 0 });
