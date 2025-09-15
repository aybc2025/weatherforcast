/* ===== DOM ===== */
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
const chartsWrap = $('#chartsWrap');
const toggleChartsBtn = $('#toggleChartsBtn');

const unitBtn = $('#unitBtn');
let beforeInstallPromptEvent = null;
const installBtn = $('#installBtn');

/* ===== מצב ===== */
let currentPlace = null;
let currentTimezone = 'UTC';
let unit = getUnit();
let lastDailyData = null;
let lastCurrentWeather = null;

let tempCanvas = null, popCanvas = null;
let resizeObs = null;

let showCharts = getShowChartsPref();

/* ===== SW ===== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  });
}

/* ===== Install ===== */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); beforeInstallPromptEvent = e; installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  if (!beforeInstallPromptEvent) return;
  beforeInstallPromptEvent.prompt(); await beforeInstallPromptEvent.userChoice;
  installBtn.hidden = true; beforeInstallPromptEvent = null;
});

/* ===== Units ===== */
function getUnit(){ return localStorage.getItem('weather:unit') === 'F' ? 'F' : 'C'; }
function setUnit(u){ unit = (u === 'F') ? 'F' : 'C'; localStorage.setItem('weather:unit', unit); unitBtn.textContent = unit === 'F' ? '°F' : '°C'; }
setUnit(unit);
function cToF(c){ return (c * 9/5) + 32; }
function fmtTemp(c){ const v = unit === 'F' ? cToF(c) : c; return `${Math.round(v)}°`; }

/* ===== Charts Pref + מיקרו-אנימציה ===== */
function getShowChartsPref(){ return localStorage.getItem('weather:showCharts') !== 'false'; }
function setShowChartsPref(v){
  showCharts = !!v;
  localStorage.setItem('weather:showCharts', String(showCharts));
  if (!chartsWrap) return;
  if (showCharts){
    chartsWrap.hidden = false;
    chartsWrap.classList.add('fade-in');
    chartsWrap.addEventListener('animationend', ()=> chartsWrap.classList.remove('fade-in'), {once:true});
  }else{
    chartsWrap.hidden = true;
  }
  if (toggleChartsBtn){
    toggleChartsBtn.textContent = showCharts ? 'הסתר גרפים' : 'הצג גרפים';
    toggleChartsBtn.setAttribute('aria-pressed', String(showCharts));
  }
}

/* ===== ברירת מחדל למועדפים ===== */
function getDefaultFavorite() {
  try {
    const defaultKey = localStorage.getItem('weather:defaultFavorite');
    if (!defaultKey) return null;
    const favorites = getFavorites();
    return favorites.find(f => placeId(f) === defaultKey) || null;
  } catch {
    return null;
  }
}

function setDefaultFavorite(place) {
  if (!place) {
    localStorage.removeItem('weather:defaultFavorite');
    return;
  }
  localStorage.setItem('weather:defaultFavorite', placeId(place));
}

function isDefaultFavorite(place) {
  const defaultKey = localStorage.getItem('weather:defaultFavorite');
  return defaultKey === placeId(place);
}

/* ===== טעינה אוטומטית של ברירת מחדל ===== */
async function loadDefaultFavoriteOnStart() {
  const defaultFav = getDefaultFavorite();
  if (!defaultFav) return;

  try {
    // הצגת הודעה על טעינה אוטומטית
    const message = document.createElement('div');
    message.className = 'auto-load-message';
    message.textContent = `טוען ברירת מחדל: ${titleFromPlace(defaultFav)}...`;
    document.querySelector('.container').insertBefore(message, document.querySelector('.card.search').nextSibling);

    const data = await fetchForecast(defaultFav.latitude, defaultFav.longitude, 'auto');
    render(defaultFav, data);
    
    // הסרת הודעת הטעינה
    setTimeout(() => message.remove(), 2000);
  } catch (e) {
    // ניסיון טעינה מהמטמון
    const cached = localStorage.getItem(cacheKeyFor(defaultFav));
    if (cached) {
      try {
        const { place, data } = JSON.parse(cached);
        render(place, data);
        
        const message = document.createElement('div');
        message.className = 'auto-load-message';
        message.textContent = `נטען מהמטמון: ${titleFromPlace(place)} (לא מעודכן)`;
        document.querySelector('.container').insertBefore(message, document.querySelector('.card.search').nextSibling);
        setTimeout(() => message.remove(), 3000);
      } catch {}
    }
  }
}

/* ===== Time helpers ===== */
const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const fmtTimeInTZ = (iso, tz)=> new Date(iso).toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit',timeZone:tz});
const fmtDateInTZ = (d, tz)=> new Date(d+'T00:00:00').toLocaleDateString('he-IL',{weekday:'long',day:'2-digit',month:'2-digit',timeZone:tz});

/* ===== UI helpers ===== */
function wmoIcon(code){
  if (code === 0) return '☀️';
  if ([1,2,3].includes(code)) return '⛅';
  if ([45,48].includes(code)) return '🌫️';
  if ((code>=51 && code<=67) || (code>=80 && code<=82)) return '🌧️';
  if (code>=71 && code<=77) return '❄️';
  if (code>=95) return '⛈️';
  return '🌥️';
}
const titleFromPlace = p => [p.name, p.admin1, p.country].filter(Boolean).join(', ');

/* ===== API ===== */
async function geocodeByName(name){
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', name); url.searchParams.set('count', '8');
  url.searchParams.set('language', 'he'); url.searchParams.set('format', 'json');
  const r = await fetch(url); if(!r.ok) throw new Error('שגיאת גיאוקודינג'); return r.json();
}
async function reverseGeocode(lat, lon){
  const url = new URL('https://geocoding-api.open-meteo.com/v1/reverse');
  url.searchParams.set('latitude', lat); url.searchParams.set('longitude', lon);
  url.searchParams.set('language', 'he'); url.searchParams.set('format', 'json');
  const r = await fetch(url); if(!r.ok) throw new Error('שגיאת Reverse Geocoding'); return r.json();
}
async function fetchForecast(lat, lon, tz='auto'){
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat); url.searchParams.set('longitude', lon);
  url.searchParams.set('current_weather', 'true');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode,sunrise,sunset');
  url.searchParams.set('timezone', tz);
  
  // הוספת תאריכי התחלה וסיום כדי לוודא שמקבלים רק ימים עתידיים
  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  url.searchParams.set('start_date', today);
  url.searchParams.set('end_date', endDate);
  
  const r = await fetch(url); if(!r.ok) throw new Error('שגיאה בשליפת תחזית'); return r.json();
}
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 9000 } = options;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(resource, { ...options, signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function fetchHourly(lat, lon, dateStr, tz='auto'){
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('hourly', 'temperature_2m,precipitation_probability,precipitation,windspeed_10m,weathercode,relativehumidity_2m');
  url.searchParams.set('timezone', tz);
  url.searchParams.set('start_date', dateStr);
  url.searchParams.set('end_date', dateStr);

  // ניסיון ראשון
  try {
    const r = await fetchWithTimeout(url, { timeout: 9000 });
    return r.json();
  } catch (e) {
    // ניסיון חוזר קצר (לפעמים נפילות רגעיות)
    const r2 = await fetchWithTimeout(url, { timeout: 9000 });
    return r2.json();
  }
}

/* ===== Canvas utils ===== */
function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined; }
function dpiCanvas(canvas){ const ratio = Math.max(1, window.devicePixelRatio || 1); const cssW = canvas.clientWidth || 300; const cssH = canvas.clientHeight || 260; canvas.width = Math.round(cssW * ratio); canvas.height = Math.round(cssH * ratio); const ctx = canvas.getContext('2d'); ctx.setTransform(ratio,0,0,ratio,0,0); return ctx; }
function drawValueTag(ctx,x,y,text){ const padX=4; ctx.font='11px Heebo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'; const w=ctx.measureText(text).width+padX*2, h=16, rx=6, bx=x-w/2, by=y-h-6; ctx.fillStyle='rgba(0,0,0,.35)'; ctx.beginPath(); ctx.moveTo(bx+rx,by); ctx.arcTo(bx+w,by,bx+w,by+h,rx); ctx.arcTo(bx+w,by+h,bx,by+h,rx); ctx.arcTo(bx,by+h,bx,by,rx); ctx.arcTo(bx,by,bx+w,by,rx); ctx.closePath(); ctx.fill(); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,x,by+h/2); }
function drawLineChart(canvas, labels, values, {min=null,max=null,yLabelFormatter=(v)=>String(v),strokeStyle=cssVar('--line1'),fill=false,showDots=true,showValueLabels=false,valueLabelFormatter=(v)=>String(v),labelStep=3,labelFilter=null}={}){
  const ctx=dpiCanvas(canvas); const W=canvas.clientWidth,H=canvas.clientHeight; ctx.clearRect(0,0,W,H);
  const pad={l:54,r:14,t:20,b:32}, w=W-pad.l-pad.r, h=H-pad.t-pad.b;
  const vmin=(min!==null)?min:Math.min(...values), vmax=(max!==null)?max:Math.max(...values), span=(vmax-vmin)||1;
  ctx.direction='ltr';
  ctx.strokeStyle=cssVar('--grid')||'#d6dbe6'; ctx.lineWidth=1.1; ctx.beginPath(); for(let i=0;i<=4;i++){ const y=pad.t + (h*i/4); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y);} ctx.stroke();
  ctx.fillStyle=cssVar('--muted')||'#5b6876'; ctx.font='13px Heebo, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'; ctx.textAlign='left'; ctx.textBaseline='middle';
  for(let i=0;i<=4;i++){ const v=vmax-(span*i/4), y=pad.t+(h*i/4); ctx.fillText(yLabelFormatter(Math.round(v)),8,y); }
  const pts=values.map((v,i)=>({ x: pad.l + (w*(values.length===1?0.5:i/(values.length-1))), y: pad.t + h - ((v-vmin)/span)*h, v, i }));
  ctx.strokeStyle=strokeStyle||'#2b7de9'; ctx.lineWidth=2.8; ctx.beginPath(); pts.forEach(({x,y},i)=>{ if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  if(fill){ ctx.lineTo(pad.l+w,pad.t+h); ctx.lineTo(pad.l,pad.t+h); ctx.closePath(); const g=ctx.createLinearGradient(0,pad.t,0,pad.t+h); g.addColorStop(0,'rgba(43,125,233,.20)'); g.addColorStop(1,'rgba(43,125,233,0)'); ctx.fillStyle=g; ctx.fill(); }
  if(showDots){ ctx.fillStyle=strokeStyle; pts.forEach(({x,y},i)=>{ if(i%2) return; ctx.beginPath(); ctx.arc(x,y,2.6,0,Math.PI*2); ctx.fill(); }); }
  if(showValueLabels){ pts.forEach(({x,y,v,i})=>{ if(i%labelStep!==0) return; if(typeof labelFilter==='function'&&!labelFilter(v,i)) return; drawValueTag(ctx,x,y,valueLabelFormatter(v)); }); }
  ctx.fillStyle=cssVar('--muted')||'#5b6876'; ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  for(let i=0;i<labels.length;i+=3){ const x=pad.l + (w*(labels.length===1?0.5:i/(labels.length-1))); ctx.fillText(labels[i],x,H-6); }
}

/* ===== Render - עם תיקון השעות ===== */
function render(place, data){
  currentPlace = place; currentTimezone = data.timezone || 'UTC';
  lastDailyData = data.daily; lastCurrentWeather = data.current_weather;

  placeTitle.textContent = titleFromPlace(place);
  coordsEl.textContent = `lat ${(+place.latitude).toFixed(3)}, lon ${(+place.longitude).toFixed(3)}`;

  // חישוב זמן העדכון
  const updateTime = new Date(lastCurrentWeather.time);
  const now = new Date();
  const timeDiff = Math.floor((now - updateTime) / (1000 * 60)); // הפרש בדקות

  let timeText = '';
  if (timeDiff < 60) {
    timeText = `לפני ${timeDiff} דקות`;
  } else if (timeDiff < 1440) { // פחות מיום
    const hours = Math.floor(timeDiff / 60);
    timeText = `לפני ${hours} שעות`;
  } else {
    timeText = `נתונים מ-${fmtTimeInTZ(lastCurrentWeather.time, currentTimezone)}`;
  }

  currentBox.innerHTML = `
    עכשיו: ${wmoIcon(lastCurrentWeather.weathercode)}
    <b>${fmtTemp(lastCurrentWeather.temperature)}</b>
    · רוח ${lastCurrentWeather.windspeed} קמ"ש (כיוון ${lastCurrentWeather.winddirection}°)
    · ${timeText}
  `;

  // תיקון השעות - עכשיו הכל נמצא בתוך ה-chip
  sunriseEl.innerHTML = `
    <span>זריחה</span>
    <b>${fmtTimeInTZ(lastDailyData.sunrise[0], currentTimezone)}</b>
    <div class="local-time">מקומי: ${fmtTimeInTZ(lastDailyData.sunrise[0], localTZ)}</div>
  `;
  sunsetEl.innerHTML = `
    <span>שקיעה</span>
    <b>${fmtTimeInTZ(lastDailyData.sunset[0], currentTimezone)}</b>
    <div class="local-time">מקומי: ${fmtTimeInTZ(lastDailyData.sunset[0], localTZ)}</div>
  `;
  tzEl.innerHTML = `<span>אזור זמן</span><b>${currentTimezone}</b>`;

  // ימים עם טקסט מתוקן - רק ימים מהיום ואילך
  dailyGrid.innerHTML = '';
  const d = lastDailyData;
  const today = new Date().toISOString().split('T')[0];
  
  for (let i = 0; i < d.time.length; i++) {
    const dateStr = d.time[i];
    // דילוג על ימים עברו
    if (dateStr < today) continue;
    
    const dayIndex = dailyGrid.children.length; // מספר הכרטיס הנוכחי שמוצג
    const card = document.createElement('div');
    card.className = 'day';
    card.style.setProperty('--d', `${dayIndex * 40}ms`);
    card.setAttribute('data-date', dateStr);
    
    // תצוגה מיוחדת ליום הראשון והשני
    let dayLabel;
    if (dayIndex === 0) {
      dayLabel = 'היום';
    } else if (dayIndex === 1) {
      dayLabel = 'מחר';
    } else {
      dayLabel = fmtDateInTZ(dateStr, currentTimezone);
    }
    
    card.innerHTML = `
      <div class="d">${dayLabel}</div>
      <div class="rowline">
        <div class="wx">${wmoIcon(d.weathercode[i])}</div>
        <div class="temps"><span class="max">${fmtTemp(d.temperature_2m_max[i])}</span><span class="min">${fmtTemp(d.temperature_2m_min[i])}</span></div>
      </div>
      <div class="meta">
        <div class="l">משקעים: ${d.precipitation_sum[i]} מ״מ</div>
        <div class="l">זריחה: ${fmtTimeInTZ(d.sunrise[i], currentTimezone)}</div>
        <div class="l">שקיעה: ${fmtTimeInTZ(d.sunset[i], currentTimezone)}</div>
      </div>
      <div class="click-hint">לחץ לתחזית שעתית</div>
    `;
    
    card.addEventListener('click', async () => {
      if (!currentPlace) return;
      try {
        const hourly = await fetchHourly(currentPlace.latitude, currentPlace.longitude, dateStr, 'auto');
        openHourlyWithCharts(dateStr, hourly);
      } catch (e) {
        hourlyPanel.classList.add('active');
        hourlyPanel.setAttribute('aria-hidden', 'false');
        hourlyTitle.textContent = `תחזית לפי שעה – ${fmtDateInTZ(dateStr, currentTimezone)}`;
        chartsWrap.hidden = true;
        hourlyBody.innerHTML = `<div class="hour-row"><div class="h">—</div><div class="v"><b>לא ניתן לטעון נתוני שעה (אופליין/רשת עמוסה).</b> נסו שוב בעוד רגע.</div></div>`;
      }
    });
    dailyGrid.appendChild(card);
  }

  resultWrap.hidden = false;

  localStorage.setItem(cacheKeyFor(place), JSON.stringify({place, data, ts: Date.now()}));
  updateFavToggle(isFavorite(place));
}

/* ===== Hourly + Charts ===== */
function openHourlyWithCharts(dateStr, hourlyData){
  hourlyBody.innerHTML = '';
  hourlyPanel.classList.add('active');
  hourlyPanel.setAttribute('aria-hidden','false');

  setShowChartsPref(showCharts);
  hourlyTitle.textContent = `תחזית לפי שעה – ${fmtDateInTZ(dateStr, currentTimezone)}`;

  const h = hourlyData.hourly;
  const labels = h.time.map(t => fmtTimeInTZ(t, currentTimezone));
  const tempsC = h.temperature_2m.map(Number);
  const tempsDisplay = tempsC.map(c => unit==='F' ? cToF(c) : c);
  const pops = (h.precipitation_probability || []).map(v => v ?? 0);

  tempCanvas = document.getElementById('tempChart');
  popCanvas  = document.getElementById('popChart');

  requestAnimationFrame(()=> {
    drawLineChart(tempCanvas, labels, tempsDisplay, { yLabelFormatter: v => `${Math.round(v)}°`, strokeStyle: cssVar('--line1'), fill: true, showDots:true, showValueLabels:true, valueLabelFormatter:v=>`${Math.round(v)}°`, labelStep:3 });
    drawLineChart(popCanvas, labels, pops, { min:0,max:100,yLabelFormatter:v=>`${Math.round(v)}%`, strokeStyle:cssVar('--line2'), showDots:true, showValueLabels:true, valueLabelFormatter:v=>`${Math.round(v)}%`, labelStep:3, labelFilter:v=>v>=10 });

    for (let i=0;i<h.time.length;i++){
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

    if (resizeObs) resizeObs.disconnect();
    resizeObs = new ResizeObserver(()=>{
      if (!hourlyPanel.classList.contains('active')) return;
      drawLineChart(tempCanvas, labels, tempsDisplay, { yLabelFormatter:v=>`${Math.round(v)}°`, strokeStyle:cssVar('--line1'), fill:true, showDots:true, showValueLabels:true, valueLabelFormatter:v=>`${Math.round(v)}°`, labelStep:3 });
      drawLineChart(popCanvas, labels, pops, { min:0,max:100,yLabelFormatter:v=>`${Math.round(v)}%`, strokeStyle:cssVar('--line2'), showDots:true, showValueLabels:true, valueLabelFormatter:v=>`${Math.round(v)}%`, labelStep:3, labelFilter:v=>v>=10 });
    });
    resizeObs.observe(hourlyPanel.querySelector('.drawer-sheet'));
  });
}

hourlyCloseBtn.addEventListener('click', ()=>{
  hourlyPanel.classList.remove('active'); hourlyPanel.setAttribute('aria-hidden','true');
  if (resizeObs) resizeObs.disconnect();
});
toggleChartsBtn?.addEventListener('click', ()=> setShowChartsPref(!showCharts) );

/* ===== Search + Autocomplete ===== */
async function doSearch(){
  const q = (cityInput.value||'').trim();
  if(!q){ errorBox.textContent='נא להזין שם עיר.'; return; }
  errorBox.textContent=''; suggBox.hidden = true; suggBox.innerHTML = '';
  searchBtn.disabled = true;
  try{
    const res = await geocodeByName(q);
    if(!res.results || res.results.length===0) throw new Error('לא נמצאו תוצאות.');
    showSuggestions(res.results);
  }catch(e){ errorBox.textContent = e.message || 'שגיאה בחיפוש.'; }
  finally{ searchBtn.disabled = false; }
}
async function selectPlace(p){
  suggBox.hidden = true;
  try{ const data = await fetchForecast(p.latitude, p.longitude, 'auto'); render(p, data); }
  catch(e){
    errorBox.textContent = 'שגיאה בשליפת תחזית.';
    const cached = localStorage.getItem(cacheKeyFor(p));
    if (cached){ try{ const {place, data} = JSON.parse(cached); render(place, data); }catch{} }
  }
}

let suggIndex = -1;
function showSuggestions(results){
  suggBox.innerHTML = '';
  results.forEach((p,idx)=>{
    const b = document.createElement('button');
    b.role = 'option'; b.dataset.idx = idx;
    b.innerHTML = `${p.name}${p.admin1? ' · '+p.admin1:''} · ${p.country}`;
    b.addEventListener('click', ()=> selectPlace(p));
    suggBox.appendChild(b);
  });
  suggIndex = -1; suggBox.hidden = results.length === 0;
}
function debounce(fn, ms){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); }; }
const onTypeSearch = debounce(async ()=>{
  const q = (cityInput.value||'').trim();
  if (q.length < 2){ suggBox.hidden = true; suggBox.innerHTML=''; return; }
  try{ const res = await geocodeByName(q); showSuggestions(res.results||[]); }
  catch{ suggBox.hidden = true; suggBox.innerHTML=''; }
}, 300);
cityInput.addEventListener('input', onTypeSearch);
cityInput.addEventListener('keydown', (e)=>{
  const items = Array.from(suggBox.querySelectorAll('button')); if (suggBox.hidden || items.length===0) return;
  if (e.key === 'ArrowDown'){ e.preventDefault(); suggIndex = (suggIndex+1)%items.length; items.forEach(b=>b.classList.remove('focus')); items[suggIndex].classList.add('focus'); items[suggIndex].scrollIntoView({block:'nearest'}); }
  if (e.key === 'ArrowUp'){ e.preventDefault(); suggIndex = (suggIndex-1+items.length)%items.length; items.forEach(b=>b.classList.remove('focus')); items[suggIndex].classList.add('focus'); items[suggIndex].scrollIntoView({block:'nearest'}); }
  if (e.key === 'Enter' && suggIndex>=0){ e.preventDefault(); items[suggIndex].click(); }
});
document.addEventListener('click', (e)=>{ if (!suggBox.contains(e.target) && e.target!==cityInput) suggBox.hidden = true; });

/* ===== Location ===== */
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
        if (rev.results && rev.results[0]){ const r = rev.results[0]; place = {...r, latitude, longitude}; }
      }catch{}
      const data = await fetchForecast(latitude, longitude, 'auto');
      render(place, data);
    }catch(e){ errorBox.textContent = 'נכשלה שליפת נתונים לפי מיקום.'; }
    finally{ locBtn.disabled = false; }
  }, err=>{ locBtn.disabled = false; errorBox.textContent = 'לא ניתן לקבל מיקום: ' + (err.message || ''); }, {timeout:10000});
});

/* ===== Favorites ===== */
function favKey(){ return 'weather:favorites'; }
function getFavorites(){ try{ return JSON.parse(localStorage.getItem(favKey())) || []; }catch{ return []; } }
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
  saveFavorites(list); renderFavList();
});

/* ===== עדכון רשימת מועדפים עם ברירת מחדל ===== */
function renderFavList() {
  const list = getFavorites();
  favList.innerHTML = '';
  
  if (list.length === 0) {
    favList.innerHTML = `<p class="muted small" style="padding:8px 10px">אין מועדפים עדיין. חפשו עיר ולחצו ☆ כדי לשמור.</p>`;
    return;
  }

  list.forEach(p => {
    const item = document.createElement('div');
    item.className = `fav-item ${isDefaultFavorite(p) ? 'is-default' : ''}`;
    item.tabIndex = 0;
    
    item.innerHTML = `
      <div class="meta">
        <div class="name">${titleFromPlace(p)}</div>
        <div class="muted small" style="opacity:.9">lat ${(+p.latitude).toFixed(3)}, lon ${(+p.longitude).toFixed(3)}</div>
      </div>
      <div class="actions">
        <button class="btn small default-btn ${isDefaultFavorite(p) ? 'active' : ''}" 
                title="הגדר כברירת מחדל" 
                aria-label="הגדר כברירת מחדל"
                type="button">
          ${isDefaultFavorite(p) ? 'ברירת מחדל' : 'הגדר ברירת מחדל'}
        </button>
        <button class="btn small delete" title="מחק" aria-label="מחק" type="button">מחק</button>
      </div>
    `;

    // לחיצה על הפריט - טעינת התחזית
    item.addEventListener('click', async (e) => {
      if (e.target.closest('.default-btn') || e.target.closest('.delete')) return;
      
      favPanel.classList.remove('active');
      try {
        const data = await fetchForecast(p.latitude, p.longitude, 'auto');
        render(p, data);
      } catch (e) {
        const cached = localStorage.getItem(cacheKeyFor(p));
        if (cached) {
          try {
            const { place, data } = JSON.parse(cached);
            render(place, data);
          } catch {}
        } else {
          errorBox.textContent = 'אין חיבור ואין מטמון זמין ליעד זה.';
        }
      }
    });

    // כפתור ברירת מחדל
    item.querySelector('.default-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (isDefaultFavorite(p)) {
        setDefaultFavorite(null); // ביטול ברירת מחדל
      } else {
        setDefaultFavorite(p); // הגדרה כברירת מחדל
      }
      renderFavList(); // רענון הרשימה
    });

    // כפתור מחיקה
    item.querySelector('.delete').addEventListener('click', (ev) => {
      ev.stopPropagation();
      const left = getFavorites().filter(f => placeId(f) !== placeId(p));
      saveFavorites(left);
      
      // אם זה היה ברירת המחדל, מבטלים אותה
      if (isDefaultFavorite(p)) {
        setDefaultFavorite(null);
      }
      
      renderFavList();
    });

    favList.appendChild(item);
  });
}

favOpenBtn.addEventListener('click', ()=>{ favPanel.classList.add('active'); renderFavList(); favPanel.setAttribute('aria-hidden','false'); });
favCloseBtn.addEventListener('click', ()=>{ favPanel.classList.remove('active'); favPanel.setAttribute('aria-hidden','true'); });
favClearBtn.addEventListener('click', ()=>{ 
  // ביטול ברירת מחדל אם קיימת
  setDefaultFavorite(null);
  saveFavorites([]); 
  renderFavList();
  renderHomeFavorites(); // עדכון המועדפים בדף הראשי
});

/* ===== Actions ===== */
searchBtn.addEventListener('click', doSearch);
cityInput.addEventListener('keydown', e=>{ if(e.key==='Enter' && suggBox.hidden) doSearch(); });
unitBtn.addEventListener('click', ()=>{
  setUnit(unit === 'C' ? 'F' : 'C');
  if (currentPlace && lastDailyData && lastCurrentWeather){
    render(currentPlace, { timezone: currentTimezone, current_weather: lastCurrentWeather, daily: lastDailyData });
  }
});

/* מצב כפתור גרפים בהפעלה */
setShowChartsPref(showCharts);

// הוספת הטעינה האוטומטית לטעינת העמוד
document.addEventListener('DOMContentLoaded', () => {
  // המתנה קצרה לוודא שהכל נטען
  setTimeout(loadDefaultFavoriteOnStart, 500);
});

// גם כאשר העמוד נטען (fallback)
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!currentPlace) {
      loadDefaultFavoriteOnStart();
    }
  }, 1000);
});