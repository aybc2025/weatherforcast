/* ====== עזרי DOM ====== */
const $ = s => document.querySelector(s);
const cityInput = $('#cityInput');
const searchBtn = $('#searchBtn');
const locBtn = $('#locBtn');
const suggBox = $('#suggestions');
const errorBox = $('#error');

const resultWrap = $('#resultWrap');
const placeTitle = $('#placeTitle');
const coordsEl = $('#coords');
const currentBox = $('#current');
const sunriseEl = $('#sunrise');
const sunsetEl = $('#sunset');
const tzEl = $('#tz');
const dailyGrid = $('#dailyGrid');
const favToggle = $('#favToggle');

const favPanel = $('#favPanel');
const favOpenBtn = $('#favOpenBtn');
const favCloseBtn = $('#favCloseBtn');
const favClearBtn = $('#favClearBtn');
const favList = $('#favList');

const hourlyPanel = $('#hourlyPanel');
const hourlyCloseBtn = $('#hourlyCloseBtn');
const hourlyBody = $('#hourlyBody');
const hourlyTitle = $('#hourlyTitle');

const unitBtn = $('#unitBtn');
let beforeInstallPromptEvent = null;
const installBtn = $('#installBtn');

/* ====== מצב נוכחי ====== */
let currentPlace = null;
let currentTimezone = 'UTC';
let unit = getUnit(); // 'C' | 'F'
let lastDailyData = null; // נשמור להצגה מחדש לפי יחידות
let lastCurrentWeather = null;

/* ====== Service Worker ====== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  });
}

/* ====== Install Prompt ====== */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  beforeInstallPromptEvent = e;
  installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  if (!beforeInstallPromptEvent) return;
  beforeInstallPromptEvent.prompt();
  await beforeInstallPromptEvent.userChoice;
  installBtn.hidden = true;
  beforeInstallPromptEvent = null;
});

/* ====== עזרי יחידות ====== */
function getUnit(){
  return localStorage.getItem('weather:unit') === 'F' ? 'F' : 'C';
}
function setUnit(u){
  unit = (u === 'F') ? 'F' : 'C';
  localStorage.setItem('weather:unit', unit);
  unitBtn.textContent = unit === 'F' ? '°F' : '°C';
}
setUnit(unit); // עדכון כפתור בהפעלה

function cToF(c){ return (c * 9/5) + 32; }
function fmtTemp(c){
  const v = unit === 'F' ? cToF(c) : c;
  return `${Math.round(v)}°`;
}

/* ====== עזרי תצוגה ====== */
function wmoIcon(code){
  if (code === 0) return '☀️';
  if ([1,2,3].includes(code)) return '⛅';
  if ([45,48].includes(code)) return '🌫️';
  if ((code>=51 && code<=67) || (code>=80 && code<=82)) return '🌧️';
  if (code>=71 && code<=77) return '❄️';
  if (code>=95) return '⛈️';
  return '🌥️';
}
function fmtDate(d, tz){
  try{ return new Date(d+'T00:00:00').toLocaleDateString('he-IL', {weekday:'short', day:'2-digit', month:'2-digit', timeZone: tz}); }
  catch{ return d; }
}
function fmtTime(iso, tz){
  try{ return new Date(iso).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit', timeZone: tz}); }
  catch{ return iso; }
}
function titleFromPlace(p){
  return [p.name, p.admin1, p.country].filter(Boolean).join(', ');
}

/* ====== APIs ====== */
async function geocodeByName(name){
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name);
  url.searchParams.set('count', '5');
  url.searchParams.set('language', 'he');
  url.searchParams.set('format', 'json');
  const r = await fetch(url); if(!r.ok) throw new Error('שגיאת גיאוקודינג');
  return r.json();
}
async function reverseGeocode(lat, lon){
  const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('language', 'he');
  url.searchParams.set('format', 'json');
  const r = await fetch(url); if(!r.ok) throw new Error('שגיאת Reverse Geocoding');
  return r.json();
}
async function fetchForecast(lat, lon, tz='auto'){
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current_weather', 'true');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,sunrise,sunset');
  url.searchParams.set('timezone', tz);
  const r = await fetch(url); if(!r.ok) throw new Error('שגיאה בשליפת תחזית');
  return r.json();
}
async function fetchHourly(lat, lon, dateStr, tz='auto'){
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,precipitation,windspeed_10m,weathercode,relativehumidity_2m');
  url.searchParams.set('timezone', tz);
  url.searchParams.set('start_date', dateStr);
  url.searchParams.set('end_date', dateStr);
  const r = await fetch(url);
  if (!r.ok) throw new Error('שגיאה בשליפת תחזית לפי שעה');
  return r.json();
}

/* ====== ציור גרפים (Canvas, בלי ספריות) ====== */
function dpiCanvas(canvas){
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || canvas.width;
  const cssH = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(cssW * ratio);
  canvas.height = Math.round(cssH * ratio);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

function drawLineChart(canvas, labels, values, {min=null, max=null, yLabelFormatter=(v)=>String(v), strokeStyle='#2b7de9', fill=false}={}){
  const ctx = dpiCanvas(canvas);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  ctx.clearRect(0,0,W,H);

  const pad = {l:36, r:10, t:10, b:24};
  const w = W - pad.l - pad.r;
  const h = H - pad.t - pad.b;

  // גבולות Y
  const vmin = (min!==null) ? min : Math.min(...values);
  const vmax = (max!==null) ? max : Math.max(...values);
  const span = (vmax - vmin) || 1;

  // צירים/קווי עזר
  ctx.strokeStyle = '#d6dbe6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i=0;i<=4;i++){
    const y = pad.t + (h * i / 4);
    ctx.moveTo(pad.l, y);
    ctx.lineTo(W - pad.r, y);
  }
  ctx.stroke();

  // תוויות Y
  ctx.fillStyle = '#5b6876';
  ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
  for (let i=0;i<=4;i++){
    const v = vmax - (span * i / 4);
    const y = pad.t + (h * i / 4);
    ctx.fillText(yLabelFormatter(Math.round(v)), 4, y+4);
  }

  // קו הנתונים
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;
  ctx.beginPath();
  values.forEach((v, i)=>{
    const x = pad.l + (w * (values.length===1?0.5:i/(values.length-1)));
    const y = pad.t + h - ((v - vmin) / span) * h;
    if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // מילוי אופציונלי
  if (fill){
    const grd = ctx.createLinearGradient(0, pad.t, 0, pad.t+h);
    grd.addColorStop(0, 'rgba(43,125,233,.25)');
    grd.addColorStop(1, 'rgba(43,125,233,0)');
    ctx.fillStyle = grd;
    ctx.lineTo(pad.l + w, pad.t + h);
    ctx.lineTo(pad.l, pad.t + h);
    ctx.closePath();
    ctx.fill();
  }

  // תוויות X דלילות (כל 3 שעות)
  ctx.fillStyle = '#5b6876';
  for (let i=0;i<labels.length;i+=3){
    const x = pad.l + (w * (labels.length===1?0.5:i/(labels.length-1)));
    ctx.fillText(labels[i], x-12, H-6);
  }
}

/* ====== רינדור ====== */
function render(place, data){
  currentPlace = place;
  currentTimezone = data.timezone || 'UTC';
  lastDailyData = data.daily;
  lastCurrentWeather = data.current_weather;

  // כותרות
  placeTitle.textContent = titleFromPlace(place);
  coordsEl.textContent = `lat ${(+place.latitude).toFixed(3)}, lon ${(+place.longitude).toFixed(3)}`;

  // נוכחי (מומר ליחידת תצוגה)
  currentBox.innerHTML = `
    עכשיו: ${wmoIcon(lastCurrentWeather.weathercode)}
    <b>${fmtTemp(lastCurrentWeather.temperature)}</b>
    · רוח ${lastCurrentWeather.windspeed} קמ"ש (כיוון ${lastCurrentWeather.winddirection}°)
    · מעודכן: ${fmtTime(lastCurrentWeather.time, currentTimezone)}
  `;

  // זריחה/שקיעה
  sunriseEl.textContent = fmtTime(lastDailyData.sunrise[0], currentTimezone);
  sunsetEl.textContent  = fmtTime(lastDailyData.sunset[0],  currentTimezone);
  tzEl.textContent = currentTimezone;

  // ימים
  dailyGrid.innerHTML = '';
  const d = lastDailyData;
  for (let i=0;i<d.time.length;i++){
    const dateStr = d.time[i];
    const card = document.createElement('div');
    card.className = 'day';
    card.setAttribute('data-date', dateStr);
    card.innerHTML = `
      <div class="d">${fmtDate(dateStr, currentTimezone)}</div>
      <div class="wx">${wmoIcon(d.weathercode[i])}</div>
      <div class="minmax">
        <span>מ׳ <b>${fmtTemp(d.temperature_2m_max[i])}</b></span>
        <span>ק׳ <b>${fmtTemp(d.temperature_2m_min[i])}</b></span>
      </div>
      <div class="muted small">משקעים: ${d.precipitation_sum[i]} מ״מ</div>
      <div class="muted small">זריחה: ${fmtTime(d.sunrise[i], currentTimezone)} · שקיעה: ${fmtTime(d.sunset[i], currentTimezone)}</div>
      <div class="muted small">הקישו להצגת תחזית לפי שעה</div>
    `;
    // קליק → תחזית לפי שעה
    card.addEventListener('click', async ()=>{
      if (!currentPlace) return;
      try{
        const hourly = await fetchHourly(currentPlace.latitude, currentPlace.longitude, dateStr, 'auto');
        renderHourly(dateStr, hourly);
      }catch(e){
        errorBox.textContent = 'שגיאה בשליפת תחזית לפי שעה.';
      }
    });
    dailyGrid.appendChild(card);
  }

  // הצג אזור התוצאות
  resultWrap.hidden = false;

  // מטמון אחרון לאופליין
  const cacheKey = cacheKeyFor(place);
  localStorage.setItem(cacheKey, JSON.stringify({place, data, ts: Date.now()}));

  // מצב כוכב מועדפים
  updateFavToggle(isFavorite(place));
}

/* רינדור לפי שעה + גרפים */
function renderHourly(dateStr, hourlyData){
  hourlyBody.innerHTML = '';
  hourlyTitle.textContent = `תחזית לפי שעה – ${new Date(dateStr+'T00:00:00').toLocaleDateString('he-IL', {weekday:'long', day:'2-digit', month:'2-digit', timeZone: currentTimezone})}`;

  const h = hourlyData.hourly;
  const times = h.time;
  const labels = times.map(t => fmtTime(t, currentTimezone));
  const tempsC = h.temperature_2m.map(Number);
  const tempsDisplay = tempsC.map(c => unit==='F' ? cToF(c) : c);
  const pops = (h.precipitation_probability || []).map(v => v ?? 0);

  // גרף טמפרטורה
  const tempCanvas = $('#tempChart');
  drawLineChart(
    tempCanvas,
    labels,
    tempsDisplay,
    {
      yLabelFormatter: v => unit==='F' ? `${Math.round(v)}°` : `${Math.round(v)}°`,
      strokeStyle: '#2b7de9',
      fill: true
    }
  );

  // גרף הסתברות משקעים
  const popCanvas = $('#popChart');
  drawLineChart(
    popCanvas,
    labels,
    pops,
    {
      min: 0, max: 100,
      yLabelFormatter: v => `${Math.round(v)}%`,
      strokeStyle: '#0a7f3f',
      fill: false
    }
  );

  // טבלה שעתית
  for (let i=0;i<times.length;i++){
    const row = document.createElement('div');
    row.className = 'hour-row';
    row.innerHTML = `
      <div class="h">${labels[i]}</div>
      <div class="v">
        <span>${wmoIcon(h.weathercode[i])} טמ׳: <b>${fmtTemp(tempsC[i])}</b></span>
        <span>לחות: <b>${h.relativehumidity_2m[i]}%</b></span>
        <span>רוח: <b>${h.windspeed_10m[i]} קמ"ש</b></span>
        <span>משקעים: <b>${h.precipitation[i]} מ״מ</b></span>
        <span>סיכוי משקעים: <b>${(pops[i] ?? 0)}%</b></span>
      </div>
    `;
    hourlyBody.appendChild(row);
  }

  hourlyPanel.classList.add('active');
  hourlyPanel.setAttribute('aria-hidden','false');
}

/* ====== חיפוש ====== */
async function doSearch(){
  const q = (cityInput.value||'').trim();
  if(!q){ errorBox.textContent='נא להזין שם עיר.'; return; }
  errorBox.textContent=''; suggBox.hidden = true; suggBox.innerHTML = '';
  searchBtn.disabled = true;
  try{
    const res = await geocodeByName(q);
    if(!res.results || res.results.length===0) throw new Error('לא נמצאו תוצאות.');
    // הצעות
    suggBox.innerHTML = '';
    res.results.forEach((p)=>{
      const b = document.createElement('button');
      b.role = 'option';
      b.innerHTML = `${p.name}${p.admin1? ' · '+p.admin1:''} · ${p.country}`;
      b.addEventListener('click', ()=> selectPlace(p));
      suggBox.appendChild(b);
    });
    suggBox.hidden = false;
  }catch(e){
    errorBox.textContent = e.message || 'שגיאה בחיפוש.';
  }finally{
    searchBtn.disabled = false;
  }
}
async function selectPlace(p){
  suggBox.hidden = true;
  try{
    const data = await fetchForecast(p.latitude, p.longitude, 'auto');
    render(p, data);
  }catch(e){
    errorBox.textContent = 'שגיאה בשליפת תחזית.';
    const cached = localStorage.getItem(cacheKeyFor(p));
    if (cached){
      try{ const {place, data} = JSON.parse(cached); render(place, data); }catch{}
    }
  }
}


locBtn.addEventListener('click', ()=>{
  errorBox.textContent = '';
  if(!navigator.geolocation){ errorBox.textContent='הדפדפן לא תומך במיקום.'; return; }
  locBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const {latitude, longitude} = pos.coords;
      let place = {name:'המיקום שלי', admin1:'', country:'', latitude, longitude};
      try{
        const rev = await reverseGeocode(latitude, longitude);
        if (rev.results && rev.results[0]){
          const r = rev.results[0];
          place = {...r, latitude, longitude};
        }
      }catch{}
      const data = await fetchForecast(latitude, longitude, 'auto');
      render(place, data);
    }catch(e){
      errorBox.textContent = 'נכשלה שליפת נתונים לפי מיקום.';
    }finally{
      locBtn.disabled = false;
    }
  }, err=>{
    locBtn.disabled = false;
    errorBox.textContent = 'לא ניתן לקבל מיקום: ' + (err.message || '');
  }, {timeout:10000});
});

/* ====== מועדפים ====== */
function favKey(){ return 'weather:favorites'; }
function getFavorites(){
  try{ return JSON.parse(localStorage.getItem(favKey())) || []; }catch{ return []; }
}
function saveFavorites(list){ localStorage.setItem(favKey(), JSON.stringify(list)); }
function placeId(p){ return `${(+p.latitude).toFixed(4)},${(+p.longitude).toFixed(4)}`; }
function isFavorite(p){ return getFavorites().some(f => placeId(f)===placeId(p)); }
function cacheKeyFor(p){ return `weather:last:${placeId(p)}`; }

function updateFavToggle(active){
  favToggle.textContent = active ? '★' : '☆';
  favToggle.setAttribute('aria-pressed', String(!!active));
}

favToggle.addEventListener('click', ()=>{
  if (placeTitle.textContent.trim()==='') return;
  const [lat, lon] = coordsEl.textContent.replace('lat ','').replace('lon ','').split(',').map(s=>+s.replace(/[^\d\.\-]/g,''));
  const place = { name: placeTitle.textContent, admin1:'', country:'', latitude:lat, longitude:lon };
  const list = getFavorites();
  const id = placeId(place);
  const idx = list.findIndex(f => placeId(f)===id);
  if (idx>=0){ list.splice(idx,1); updateFavToggle(false); }
  else{ list.push(place); updateFavToggle(true); }
  saveFavorites(list);
  renderFavList();
});

function renderFavList(){
  const list = getFavorites();
  favList.innerHTML = '';
  if (list.length===0){
    favList.innerHTML = `<p class="muted small" style="padding:8px 10px">אין מועדפים עדיין. חפשו עיר ולחצו ☆ כדי לשמור.</p>`;
    return;
  }
  list.forEach(p=>{
    const wrap = document.createElement('div');
    wrap.className = 'fav-item';
    wrap.innerHTML = `
      <div class="meta">
        <div class="name">${titleFromPlace(p)}</div>
        <div class="muted small">lat ${(+p.latitude).toFixed(3)}, lon ${(+p.longitude).toFixed(3)}</div>
      </div>
      <div class="fav-actions">
        <button class="btn secondary" title="פתח">פתח</button>
        <button class="btn icon" title="מחק">🗑️</button>
      </div>
    `;
    const [openBtn, delBtn] = wrap.querySelectorAll('button');
    openBtn.addEventListener('click', async ()=>{
      favPanel.classList.remove('active');
      try{
        const data = await fetchForecast(p.latitude, p.longitude, 'auto');
        render(p, data);
      }catch(e){
        const cached = localStorage.getItem(cacheKeyFor(p));
        if (cached){
          try{ const {place, data} = JSON.parse(cached); render(place, data); }catch{}
        }else{
          errorBox.textContent = 'אין חיבור ואין מטמון זמין ליעד זה.';
        }
      }
    });
    delBtn.addEventListener('click', ()=>{
      const list2 = getFavorites().filter(f => placeId(f)!==placeId(p));
      saveFavorites(list2);
      renderFavList();
    });
    favList.appendChild(wrap);
  });
}
favOpenBtn.addEventListener('click', ()=>{ favPanel.classList.add('active'); renderFavList(); favPanel.setAttribute('aria-hidden','false'); });
favCloseBtn.addEventListener('click', ()=>{ favPanel.classList.remove('active'); favPanel.setAttribute('aria-hidden','true'); });
favClearBtn.addEventListener('click', ()=>{ saveFavorites([]); renderFavList(); });

/* ====== אירועים ====== */
searchBtn.addEventListener('click', doSearch);
cityInput.addEventListener('keydown', e=>{ if(e.key==='Enter') doSearch(); });

document.addEventListener('click', (e)=>{
  if (!suggBox.contains(e.target) && e.target!==cityInput) suggBox.hidden = true;
});

hourlyCloseBtn.addEventListener('click', ()=>{
  hourlyPanel.classList.remove('active');
  hourlyPanel.setAttribute('aria-hidden','true');
});

/* מתג יחידות °C/°F */
unitBtn.addEventListener('click', ()=>{
  setUnit(unit === 'C' ? 'F' : 'C');
  // רינדור מחדש של נוכחי/יומי אם יש נתונים
  if (currentPlace && lastDailyData && lastCurrentWeather){
    render(currentPlace, { timezone: currentTimezone, current_weather: lastCurrentWeather, daily: lastDailyData });
  }
});
