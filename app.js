/* ===========================================================
   SkyTrain MVP — Expo, Millennium, Canada
   - מסלולים (סטטי): דייקסטרה, עד 2 החלפות, תדירויות בסיס
   - מפה: טעינת SVG מוויקיפדיה, חילוץ x,y עם getBBox(), הדגשה
=========================================================== */

/* ===== קווים וזמני שירות ===== */
const LINE_META = {
  EXPO: {
    id: "EXPO", name: "Expo Line", color: "#0060A9",
    headways: [
      { start: "05:00", end: "06:59", mins: 8 },
      { start: "07:00", end: "09:59", mins: 4 },
      { start: "10:00", end: "15:59", mins: 6 },
      { start: "16:00", end: "18:59", mins: 4 },
      { start: "19:00", end: "25:15", mins: 8 } // עד 01:15
    ],
    firstTrain: "05:00", lastTrain: "25:15"
  },
  MILL: {
    id: "MILL", name: "Millennium Line", color: "#FDB515",
    headways: [
      { start: "05:00", end: "06:59", mins: 8 },
      { start: "07:00", end: "09:59", mins: 5 },
      { start: "10:00", end: "15:59", mins: 6 },
      { start: "16:00", end: "18:59", mins: 5 },
      { start: "19:00", end: "25:15", mins: 8 }
    ],
    firstTrain: "05:00", lastTrain: "25:15"
  },
  CAN: {
    id: "CAN", name: "Canada Line", color: "#00B7C3",
    headways: [
      { start: "05:00", end: "06:59", mins: 6 },
      { start: "07:00", end: "09:59", mins: 4 },
      { start: "10:00", end: "15:59", mins: 5 },
      { start: "16:00", end: "18:59", mins: 4 },
      { start: "19:00", end: "25:15", mins: 6 }
    ],
    firstTrain: "05:00", lastTrain: "25:15"
  }
};

/* ===== עזרי זמן ===== */
const pad2 = n => String(n).padStart(2,"0");
function toMinutesWrap(hhmm){ const [h,m]=hhmm.split(":").map(Number); return ((h%24)*60+m)+(h>=24?1440:0); }
const toHHMM = mins => `${pad2(Math.floor((mins%1440)/60))}:${pad2(mins%60)}`;
function headwayFor(lineId, depMins){
  const meta = LINE_META[lineId]; const t = depMins % 1440; const t2 = (depMins<1440)? t : t+1440;
  for (const w of meta.headways){
    const s = toMinutesWrap(w.start), e = toMinutesWrap(w.end);
    if (s<=t2 && t2<=e) return w.mins;
  }
  return meta.headways.at(-1).mins;
}
function scheduleDeparture(lineId, earliest){
  const meta = LINE_META[lineId];
  const first = toMinutesWrap(meta.firstTrain), last = toMinutesWrap(meta.lastTrain);
  let depart = Math.max(earliest, first);
  if (depart > last) return null;
  const hw = headwayFor(lineId, depart);
  const offset = (depart - first) % hw;
  if (offset !== 0) depart += (hw - offset);
  return depart <= last ? depart : null;
}

/* ===== גרף תחנות (קשתות) ===== */
function E(a,b,mins,line){ return {a,b,mins,line}; }
const EDGES = [
  // EXPO: Waterfront -> Columbia
  E("Waterfront","Burrard",2,"EXPO"), E("Burrard","Granville",2,"EXPO"),
  E("Granville","Stadium–Chinatown",3,"EXPO"), E("Stadium–Chinatown","Main Street–Science World",3,"EXPO"),
  E("Main Street–Science World","Commercial–Broadway",4,"EXPO"),
  E("Commercial–Broadway","Nanaimo",3,"EXPO"), E("Nanaimo","29th Avenue",2,"EXPO"),
  E("29th Avenue","Joyce–Collingwood",3,"EXPO"), E("Joyce–Collingwood","Patterson",3,"EXPO"),
  E("Patterson","Metrotown",3,"EXPO"), E("Metrotown","Royal Oak",3,"EXPO"),
  E("Royal Oak","Edmonds",3,"EXPO"), E("Edmonds","22nd Street",3,"EXPO"),
  E("22nd Street","New Westminster",2,"EXPO"), E("New Westminster","Columbia",2,"EXPO"),
  // EXPO לענף King George
  E("Columbia","Scott Road",2,"EXPO"), E("Scott Road","Gateway",3,"EXPO"),
  E("Gateway","Surrey Central",3,"EXPO"), E("Surrey Central","King George",2,"EXPO"),
  // EXPO לענף Production Way
  E("Columbia","Sapperton",3,"EXPO"), E("Sapperton","Braid",3,"EXPO"),
  E("Braid","Lougheed Town Centre",4,"EXPO"), E("Lougheed Town Centre","Production Way–University",2,"EXPO"),
  // MILLENNIUM
  E("VCC–Clark","Commercial–Broadway",3,"MILL"), E("Commercial–Broadway","Renfrew",2,"MILL"),
  E("Renfrew","Rupert",2,"MILL"), E("Rupert","Gilmore",3,"MILL"),
  E("Gilmore","Brentwood Town Centre",3,"MILL"), E("Brentwood Town Centre","Holdom",2,"MILL"),
  E("Holdom","Sperling–Burnaby Lake",3,"MILL"), E("Sperling–Burnaby Lake","Lake City Way",2,"MILL"),
  E("Lake City Way","Production Way–University",2,"MILL"), E("Production Way–University","Lougheed Town Centre",3,"MILL"),
  E("Lougheed Town Centre","Burquitlam",3,"MILL"), E("Burquitlam","Moody Centre",4,"MILL"),
  E("Moody Centre","Inlet Centre",2,"MILL"), E("Inlet Centre","Coquitlam Central",2,"MILL"),
  E("Coquitlam Central","Lincoln",2,"MILL"), E("Lincoln","Lafarge Lake–Douglas",2,"MILL"),
  // CANADA
  E("Waterfront","Vancouver City Centre",2,"CAN"), E("Vancouver City Centre","Yaletown–Roundhouse",2,"CAN"),
  E("Yaletown–Roundhouse","Olympic Village",3,"CAN"), E("Olympic Village","Broadway–City Hall",3,"CAN"),
  E("Broadway–City Hall","King Edward",3,"CAN"), E("King Edward","Oakridge–41st Avenue",3,"CAN"),
  E("Oakridge–41st Avenue","Langara–49th Avenue",3,"CAN"), E("Langara–49th Avenue","Marine Drive",3,"CAN"),
  E("Marine Drive","Bridgeport",4,"CAN"),
  E("Bridgeport","Templeton",3,"CAN"), E("Templeton","Sea Island Centre",2,"CAN"), E("Sea Island Centre","YVR–Airport",2,"CAN"),
  E("Bridgeport","Aberdeen",3,"CAN"), E("Aberdeen","Lansdowne",2,"CAN"), E("Lansdowne","Richmond–Brighouse",2,"CAN"),
];

const LINE_STOPS = { EXPO:new Set(), MILL:new Set(), CAN:new Set() };
const GRAPH_BY_LINE = { EXPO:{}, MILL:{}, CAN:{} };
for (const {a,b,mins,line} of EDGES) {
  LINE_STOPS[line].add(a); LINE_STOPS[line].add(b);
  if (!GRAPH_BY_LINE[line][a]) GRAPH_BY_LINE[line][a] = [];
  if (!GRAPH_BY_LINE[line][b]) GRAPH_BY_LINE[line][b] = [];
  GRAPH_BY_LINE[line][a].push({to:b,mins});
  GRAPH_BY_LINE[line][b].push({to:a,mins});
}
const ALL_STOPS = [...new Set(Object.values(LINE_STOPS).flatMap(s => [...s]))].sort((a,b)=>a.localeCompare(b,'he'));
const TRANSFER_HUBS = new Set(["Waterfront","Commercial–Broadway","Production Way–University","Lougheed Town Centre","Columbia"]);

/* ===== תכנון מסלולים ===== */
const LINES_ORDER = ["EXPO","MILL","CAN"];
const TRANSFER_MIN = 3;

function shortestOnLine(lineId, from, to){
  if (!LINE_STOPS[lineId].has(from) || !LINE_STOPS[lineId].has(to)) return null;
  const adj = GRAPH_BY_LINE[lineId];
  const dist = new Map(), prev = new Map(), pq = [];
  Object.keys(adj).forEach(s => dist.set(s, Infinity));
  dist.set(from,0); pq.push([0,from]);
  while(pq.length){
    pq.sort((a,b)=>a[0]-b[0]);
    const [d,u] = pq.shift();
    if (d>dist.get(u)) continue;
    if (u===to) break;
    for (const {to:v,mins} of adj[u]){
      const nd = d+mins;
      if (nd<dist.get(v)){ dist.set(v,nd); prev.set(v,u); pq.push([nd,v]); }
    }
  }
  if (dist.get(to)===Infinity) return null;
  const path = []; let cur=to;
  while(cur && cur!==from){ path.push(cur); cur=prev.get(cur); }
  path.push(from); path.reverse();
  return { mins: dist.get(to), path };
}

function intersection(aSet,bSet){ const out=[]; for (const x of aSet) if (bSet.has(x)) out.push(x); return out; }

function planCandidates(from, to, depMins){
  const cands = [];

  // קו יחיד
  for (const L of LINES_ORDER){
    const seg = shortestOnLine(L, from, to);
    if (seg){
      const d1=scheduleDeparture(L,depMins); if (d1==null) continue;
      const a1=d1+seg.mins;
      cands.push({ type:"DIRECT", transfers:0, depart:d1, arrive:a1,
        legs:[{ line:LINE_META[L].name, lineId:L, color:LINE_META[L].color, from, to, depart:d1, arrive:a1, path:seg.path }]});
    }
  }

  // החלפה אחת
  for (const L1 of LINES_ORDER){
    for (const L2 of LINES_ORDER){
      if (L1===L2) continue;
      for (const hub of intersection(LINE_STOPS[L1], LINE_STOPS[L2])){
        if (!TRANSFER_HUBS.has(hub)) continue;
        const seg1=shortestOnLine(L1,from,hub), seg2=shortestOnLine(L2,hub,to);
        if (!seg1||!seg2) continue;
        const d1=scheduleDeparture(L1,depMins); if (d1==null) continue;
        const a1=d1+seg1.mins;
        const d2=scheduleDeparture(L2,a1+TRANSFER_MIN); if (d2==null) continue;
        const a2=d2+seg2.mins;
        cands.push({ type:"TRANSFER1", transfers:1, depart:d1, arrive:a2,
          legs:[
            { line:LINE_META[L1].name, lineId:L1, color:LINE_META[L1].color, from, to:hub, depart:d1, arrive:a1, path:seg1.path },
            { line:LINE_META[L2].name, lineId:L2, color:LINE_META[L2].color, from:hub, to, depart:d2, arrive:a2, path:seg2.path }
          ]});
      }
    }
  }

  // שתי החלפות
  for (const L1 of LINES_ORDER){
    for (const L2 of LINES_ORDER){
      if (L1===L2) continue;
      for (const L3 of LINES_ORDER){
        if (L3===L1||L3===L2) continue;
        const inter12=intersection(LINE_STOPS[L1],LINE_STOPS[L2]);
        const inter23=intersection(LINE_STOPS[L2],LINE_STOPS[L3]);
        for (const h1 of inter12){
          if (!TRANSFER_HUBS.has(h1)) continue;
          const seg1=shortestOnLine(L1,from,h1); if (!seg1) continue;
          for (const h2 of inter23){
            if (!TRANSFER_HUBS.has(h2)) continue;
            const seg2=shortestOnLine(L2,h1,h2), seg3=shortestOnLine(L3,h2,to);
            if (!seg2||!seg3) continue;
            const d1=scheduleDeparture(L1,depMins); if (d1==null) continue;
            const a1=d1+seg1.mins;
            const d2=scheduleDeparture(L2,a1+TRANSFER_MIN); if (d2==null) continue;
            const a2=d2+seg2.mins;
            const d3=scheduleDeparture(L3,a2+TRANSFER_MIN); if (d3==null) continue;
            const a3=d3+seg3.mins;
            cands.push({ type:"TRANSFER2", transfers:2, depart:d1, arrive:a3,
              legs:[
                { line:LINE_META[L1].name, lineId:L1, color:LINE_META[L1].color, from, to:h1, depart:d1, arrive:a1, path:seg1.path },
                { line:LINE_META[L2].name, lineId:L2, color:LINE_META[L2].color, from:h1, to:h2, depart:d2, arrive:a2, path:seg2.path },
                { line:LINE_META[L3].name, lineId:L3, color:LINE_META[L3].color, from:h2, to, depart:d3, arrive:a3, path:seg3.path }
              ]});
          }
        }
      }
    }
  }

  // ייחודיות + מיון
  const uniq=new Map();
  for (const r of cands){
    const key = `${r.legs.map(l=>l.lineId+':'+l.from+'>'+l.to).join('|')}-${r.depart}`;
    if (!uniq.has(key)) uniq.set(key,r);
  }
  return [...uniq.values()].sort((a,b)=>(a.arrive-b.arrive)||(a.transfers-b.transfers)).slice(0,3);
}

/* ===== DOM ===== */
const fromSel = document.getElementById('fromStop');
const toSel   = document.getElementById('toStop');
const depTime = document.getElementById('depTime');
const depDate = document.getElementById('depDate');
const resultsEl = document.getElementById('results');
const favBtn = document.getElementById('favBtn');
const favsEl = document.getElementById('favs');
const btnShowOnMap = document.getElementById('btnShowOnMap');
const btnResetMap  = document.getElementById('btnResetMap');
const overlay = document.getElementById("overlay");

/* ===== טפסים/ברירת מחדל ===== */
function populateStops(){
  for (const s of ALL_STOPS){
    const o1=document.createElement('option'); o1.value=s; o1.textContent=s;
    const o2=document.createElement('option'); o2.value=s; o2.textContent=s;
    fromSel.appendChild(o1); toSel.appendChild(o2);
  }
  fromSel.value="Waterfront"; toSel.value="Commercial–Broadway";
  const now = new Date(); depDate.valueAsDate=now;
  depTime.value = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
}
function minutesFromDateTimeInputs(){
  const d = depDate.value? new Date(depDate.value) : new Date();
  const [hh,mm] = (depTime.value || "00:00").split(':').map(Number);
  d.setHours(hh??0, mm??0, 0, 0);
  const mins = d.getHours()*60 + d.getMinutes();
  return mins < 180 ? mins+1440 : mins; // תמיכה עד 01:15
}

/* ===== מועדפים ===== */
function loadFavs(){
  favsEl.innerHTML = '';
  const favs = JSON.parse(localStorage.getItem('mvpfavs') || '[]');
  if (!Array.isArray(favs) || favs.length === 0){
    favsEl.innerHTML = `<span class="text-slate-500 text-sm">אין מועדפים עדיין.</span>`;
    return;
  }
  for (const f of favs){
    const b = document.createElement('button');
    b.className = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900 hover:bg-amber-200';
    b.textContent = `⭐ ${f.from} → ${f.to}`;
    b.addEventListener('click', ()=>{
      fromSel.value = f.from; toSel.value = f.to;
      document.getElementById('tripForm').dispatchEvent(new Event('submit'));
    });
    favsEl.appendChild(b);
  }
}
function saveFav(from, to){
  const favs = JSON.parse(localStorage.getItem('mvpfavs') || '[]');
  if (!favs.find(x => x.from === from && x.to === to)){
    favs.push({ from, to });
    localStorage.setItem('mvpfavs', JSON.stringify(favs));
    loadFavs();
  }
}

/* ===== תוצאות ===== */
let lastTrips = [];
function renderResults(list){
  resultsEl.innerHTML='';
  if (!list.length){
    resultsEl.innerHTML = `<p class="text-sm text-slate-600">לא נמצאו חלופות מתאימות בטווח השעות שנבחר.</p>`;
    return;
  }
  list.forEach((r,idx)=>{
    const dur = r.arrive - r.depart;
    const el = document.createElement('div');
    el.className='border rounded-xl p-3 bg-white';
    el.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold" style="background:#eef">${r.transfers? (r.transfers===1?'החלפה אחת':'2 החלפות') : 'ישיר'}</span>
        <span class="text-sm text-slate-600">יציאה ${toHHMM(r.depart)} • הגעה ${toHHMM(r.arrive)} • ${dur} דק׳</span>
        <button class="ml-auto px-2 py-1.5 text-xs rounded bg-slate-100 hover:bg-slate-200" data-idx="${idx}">הצג מסלול על המפה</button>
      </div>
      <ol class="mt-2 space-y-2">
        ${r.legs.map(l=>`
          <li class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" style="background:${l.color}"></span>
            <span class="font-medium">${l.line}</span>
            <span class="text-slate-700">— ${l.from} → ${l.to}</span>
            <span class="ml-auto text-xs text-slate-600">${toHHMM(l.depart)} → ${toHHMM(l.arrive)}</span>
          </li>
        `).join('')}
      </ol>
    `;
    el.querySelector('button').addEventListener('click', async ()=>{
      await loadWikiMapOnce(); clearOverlay(); drawHighlightedTrip(lastTrips[idx]);
    });
    resultsEl.appendChild(el);
  });
}

/* ===== מפה: טעינת SVG מוויקיפדיה + חילוץ קואורדינטות עם getBBox() ===== */
const WIKI_SVG_URLS = [
  "https://upload.wikimedia.org/wikipedia/commons/3/34/Vancouver_SkyTrain_Map.svg",            // מה ששיתפת
  "https://upload.wikimedia.org/wikipedia/commons/e/ec/Vancouver_Skytrain_and_Seabus_Map.svg"   // גיבוי
];

let __WIKI_READY__ = false;
let __POS__ = {}; // name -> {x,y}

const NORM = s => s.normalize('NFKC').replace(/[–—]/g,"-").replace(/\s+/g," ").trim().toLowerCase();
const ALIASES = new Map([
  ["production way–university", "Production Way–University"],
  ["production way/university",  "Production Way–University"],
  ["commercial-broadway",        "Commercial–Broadway"],
  ["vancouver city centre",      "Vancouver City Centre"],
  ["oakridge-41st avenue",       "Oakridge–41st Avenue"],
  ["langara-49th avenue",        "Langara–49th Avenue"],
  ["main street-science world",  "Main Street–Science World"],
  ["yaletown-roundhouse",        "Yaletown–Roundhouse"]
]);

async function fetchTextWithFallback(urls){
  let lastErr;
  for (const url of urls){
    try{
      const res = await fetch(url, { mode: "cors", cache: "force-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();
      return { txt, url };
    }catch(e){ lastErr = e; console.warn("SVG fetch failed for", url, e); }
  }
  throw lastErr || new Error("Failed to fetch any SVG");
}

async function loadWikiMapOnce(){
  if (__WIKI_READY__) return;

  const holder = document.getElementById("wikiSvgHolder");
  holder.innerHTML = '<div class="w-full h-full grid place-items-center text-sm text-slate-600">טוען מפה…</div>';

  let txt, usedUrl, baseSvg;
  try{
    const r = await fetchTextWithFallback(WIKI_SVG_URLS);
    txt = r.txt; usedUrl = r.url;

    // ניתוח ל-<svg> חי
    const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
    baseSvg = doc.documentElement;
    if (!baseSvg || baseSvg.nodeName.toLowerCase() !== "svg") throw new Error("No <svg> root");

    // הזרקה
    holder.innerHTML = "";
    baseSvg.removeAttribute("width");
    baseSvg.removeAttribute("height");
    baseSvg.style.width = "100%";
    baseSvg.style.height = "100%";
    holder.appendChild(baseSvg);
  }catch(e){
    console.error("שגיאה בטעינת/ניתוח SVG:", e);
    // Fallback: תמונה — מפה תוצג, אבל לא נוכל להדגיש מסלול (אין קואורדינטות)
    holder.innerHTML = `<img src="${WIKI_SVG_URLS[0]}" alt="SkyTrain Map" style="width:100%;height:100%;object-fit:contain;">`;
    return;
  }

  // סנכרון viewBox של שכבת ההדגשה
  const vb = baseSvg.getAttribute("viewBox");
  if (vb) document.getElementById("overlay").setAttribute("viewBox", vb);

  // === חילוץ חכם עם getBBox() ===
  // 1) כל הטקסטים (תוויות)
  const textNodes = [...baseSvg.querySelectorAll("text")].map(t => {
    try {
      const bb = t.getBBox();
      return {
        el: t,
        x: bb.x + bb.width / 2,
        y: bb.y + bb.height / 2,
        label: (t.textContent || "").replace(/\s+/g, " ").trim()
      };
    } catch { return null; }
  }).filter(Boolean).filter(t => t.label && t.label.length <= 80);

  // 2) סמלי תחנות (לא בכל SVG יש circle “נקי”)
  const dotNodes = [...baseSvg.querySelectorAll("circle, ellipse, use")].map(el => {
    try {
      const bb = el.getBBox();
      return { el, x: bb.x + bb.width/2, y: bb.y + bb.height/2 };
    } catch { return null; }
  }).filter(Boolean);

  // 3) מילון תוויות מנורמל
  const labelByNorm = new Map();
  for (const t of textNodes) labelByNorm.set(NORM(t.label), { x:t.x, y:t.y, raw:t.label });

  // 4) בניית pos
  const pos = {};
  const wanted = new Set(ALL_STOPS);

  // (א) התאמה ישירה לפי טקסט
  for (const name of wanted) {
    const key = NORM(name);
    const direct = labelByNorm.get(key) || labelByNorm.get(NORM(ALIASES.get(key) || ""));
    if (direct) pos[name] = { x: direct.x, y: direct.y };
  }

  // (ב) השלמה מסמל הכי קרוב לתווית (עד 45 יחידות במרחב viewBox)
  function nearestDot(x, y) {
    let best = null, bestD2 = Infinity;
    for (const d of dotNodes) {
      const dx = d.x - x, dy = d.y - y, d2 = dx*dx + dy*dy;
      if (d2 < bestD2) { bestD2 = d2; best = d; }
    }
    return (best && Math.sqrt(bestD2) <= 45) ? best : null;
  }
  for (const name of wanted) {
    if (pos[name]) continue;
    const lab = labelByNorm.get(NORM(name));
    if (!lab) continue;
    const dot = nearestDot(lab.x, lab.y);
    if (dot) pos[name] = { x: dot.x, y: dot.y };
  }

  // (ג) גיבוי: אם עדיין אין — מרכז התווית
  for (const name of wanted) {
    if (pos[name]) continue;
    const lab = labelByNorm.get(NORM(name));
    if (lab) pos[name] = { x: lab.x, y: lab.y };
  }

  __POS__ = pos;
  __WIKI_READY__ = true;

  console.info(`stations resolved: ${Object.keys(pos).length} from ${usedUrl}`);
}

/* ===== ציור/ניקוי הדגשה ===== */
function clearOverlay(){ overlay.innerHTML = ""; }

function drawHighlightedTrip(trip){
  if (!trip) return;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "route-highlight");
  overlay.appendChild(g);

  for (const leg of trip.legs){
    const pts = [];
    for (const stop of leg.path){
      const p = __POS__[stop];
      if (p) pts.push(p);
    }
    if (pts.length < 2) continue;

    const d = pts.map((p,i)=> (i?`L${p.x},${p.y}`:`M${p.x},${p.y}`)).join('');
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", leg.color);
    path.setAttribute("stroke-width", "9");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("opacity", "0.95");
    g.appendChild(path);
  }
}

/* ===== אירועים ===== */
document.getElementById('tripForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const from=fromSel.value, to=toSel.value;
  if (from===to){ resultsEl.innerHTML=`<p class="text-sm text-red-600">בחר/י מוצא ויעד שונים.</p>`; return; }
  const dep = minutesFromDateTimeInputs();
  const list = planCandidates(from,to,dep);
  lastTrips = list;
  renderResults(list);
  await loadWikiMapOnce();
  clearOverlay(); // מחיקת הדגשה קודמת
});
document.getElementById('swapBtn').addEventListener('click', ()=>{
  const a=fromSel.value, b=toSel.value; fromSel.value=b; toSel.value=a;
});
favBtn.addEventListener('click', ()=>{ saveFav(fromSel.value, toSel.value); });
btnShowOnMap?.addEventListener('click', async ()=>{
  if (!lastTrips.length) return;
  await loadWikiMapOnce();
  clearOverlay();
  drawHighlightedTrip(lastTrips[0]); // מדגיש את האלטרנטיבה הראשונה
});
btnResetMap?.addEventListener('click', ()=>{ clearOverlay(); });

/* ===== אתחול ===== */
populateStops(); loadFavs();