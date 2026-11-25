import { applyTheme } from './theme.js';
import { get } from './state.js';
import { STALE_MS } from './config.js';
import { loadPlace, refresh } from './load.js';
import { getDefault, getLastPlace } from './places.js';
import { registerSW } from './pwa.js';
import { onView, showView } from './ui/nav.js';
import './ui/toast.js';
import './ui/search.js';
import './ui/home.js';
import './ui/sheet.js';
import { renderFavs, refreshFavs } from './ui/favorites.js';
import './ui/settings.js';

applyTheme();
onView(name => { if (name === 'favs') { renderFavs(); refreshFavs(); } });
showView('home');

const start = getDefault() || getLastPlace();
if (start) loadPlace(start);

// Come back to the app after a while → refresh quietly.
document.addEventListener('visibilitychange', () => {
  const s = get();
  if (!document.hidden && s.place && Date.now() - s.savedAt > STALE_MS) refresh();
});
registerSW();
