export const KEYS = {
  unit: 'weather:unit',
  wind: 'weather:windUnit',
  theme: 'weather:theme',
  charts: 'weather:showCharts',
  favs: 'weather:favorites',
  def: 'weather:defaultFavorite',
  recent: 'weather:recent',
  lastPlace: 'weather:lastPlace',
  last: id => `weather:v2:last:${id}`,
};
export const STALE_MS = 15 * 60 * 1000;
export const MAX_RECENT = 5;
export const API = {
  geo: 'https://geocoding-api.open-meteo.com/v1/search',
  reverse: 'https://geocoding-api.open-meteo.com/v1/reverse',
  forecast: 'https://api.open-meteo.com/v1/forecast',
  air: 'https://air-quality-api.open-meteo.com/v1/air-quality',
};
