/* ============================================================
   LIGTAS TIGDAS — MR SIA Dashboard · Region V (Bicol)
   Data: live Google Sheet (CSV) + local fallback
   ============================================================ */

/* ---------------- Campaign calendar 2026 ---------------- */
const DAYS = [
  { i:0, label:'Aug 10', week:1 }, { i:1, label:'Aug 11', week:1 },
  { i:2, label:'Aug 12', week:1 }, { i:3, label:'Aug 13', week:1 },
  { i:4, label:'Aug 14', week:1 }, { i:5, label:'Aug 17', week:2 },
  { i:6, label:'Aug 18', week:2 }, { i:7, label:'Aug 19', week:2 },
  { i:8, label:'Aug 20', week:2 }, { i:9, label:'Aug 21', week:2 },
  { i:10,label:'Aug 24', week:3 }, { i:11,label:'Aug 25', week:3 },
  { i:12,label:'Aug 26', week:3 }, { i:13,label:'Aug 27', week:3 },
  { i:14,label:'Aug 28', week:3 }
];
const DAY_DATES = [
  new Date(2026,7,10), new Date(2026,7,11), new Date(2026,7,12),
  new Date(2026,7,13), new Date(2026,7,14), new Date(2026,7,17),
  new Date(2026,7,18), new Date(2026,7,19), new Date(2026,7,20),
  new Date(2026,7,21), new Date(2026,7,24), new Date(2026,7,25),
  new Date(2026,7,26), new Date(2026,7,27), new Date(2026,7,28)
];
function getCurrentDayIndex(){
  const now = new Date(); now.setHours(0,0,0,0);
  for (let i = DAY_DATES.length-1; i >= 0; i--) if (now >= DAY_DATES[i]) return i;
  return -1;
}
const CURRENT_DAY_IDX = getCurrentDayIndex();
const WEEK_LABELS = ['Week 1 (Aug 10–14)','Week 2 (Aug 17–21)','Week 3 (Aug 24–28)'];
const WEEK_SHORT = ['Wk 1','Wk 2','Wk 3'];

/* ---------------- Column map (per official report layout) ---------------- */
function colIndex(letter){
  let idx = 0;
  for (const ch of String(letter).toUpperCase()) idx = idx*26 + (ch.charCodeAt(0)-64);
  return idx-1;
}
const COL = {
  name: colIndex('A'),
  target: colIndex('B'),
  days: ['C','E','G','I','K','S','U','W','Y','AA','AG','AI','AK','AM','AO'].map(colIndex),
  weekTotal: ['M','AC','AQ'].map(colIndex),
  weekDeferred: ['Q','AE','AS'].map(colIndex),
  weekRefusal: ['R','AF','AT'].map(colIndex)
};

const CONFIG = {
  sheetId: new URLSearchParams(location.search).get('sheet') || "1av1ERInFHC1DsFxrtfBvcszpA4yhTxBSv4HVnfgmWoM",
  gid: new URLSearchParams(location.search).get('gid') || 0,
  // Optional: if your Google Workspace admin has disabled "Publish to web" (common
  // on government/school accounts), paste an Apps Script Web App URL here instead.
  // See guide.md, Part 2. Leave blank to use the normal published-sheet method.
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbwULp06aJwmPk4G9jd0sjw5NX1MWF_OjoniWM7XoC4lumpBqnUchEv0Xp2-jwEHUuR22A/exec"
};

const PROV_KEYS = ['Albay','Camarines Norte','Camarines Sur','Catanduanes','Masbate','Sorsogon'];
const PROV_SHORT = { 'Camarines Norte':'Cam. Norte', 'Camarines Sur':'Cam. Sur' };

/* ---------------- Name normalisation & lookups ---------------- */
function normName(s){
  return String(s||'')
    .toLowerCase()
    .replace(/[‘’'`]/g,'')
    .replace(/ñ/g,'n')
    .replace(/\b(city of|city|province|municipality|mun\.|town)\b/g,'')
    .replace(/[^a-z0-9 ]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function regName(s){ return String(s||'').toLowerCase().replace(/\s+/g,' ').trim(); }

const LGU_MASTER = MUNICIPALITIES_DATA.features.map(f => f.properties);
const LGU_BY_NORM = {};     // norm -> {name, psgc, province}
const LGU_BY_PSGC = {};     // psgc -> master
LGU_MASTER.forEach(p => {
  LGU_BY_PSGC[p.psgc] = p;
  LGU_BY_NORM[normName(p.name)] = p;
});
// Naga City is treated as an independent component city
const NAGA_MASTER = { name:'Naga City', psgc:501724000, province:'Camarines Sur' };
LGU_BY_NORM[normName('Naga City')] = NAGA_MASTER;

const REGION_RE = /^region\s*v\b|^bicol/;
const PROV_NORM = {};
['Albay','Camarines Norte','Camarines Sur','Catanduanes','Masbate','Sorsogon'].forEach(p => { PROV_NORM[normName(p)] = p; });

/* ---------------- Entity helpers ---------------- */
function emptyEntity(name, kind, province, psgc){
  return {
    name, kind, province: province || null, psgc: psgc || null,
    target: 0,
    days: new Array(15).fill(0),
    week: [0,0,0],
    deferred: [0,0,0],
    refusal: [0,0,0],
    overall: 0, overallDeferred: 0, overallRefusal: 0, remaining: 0
  };
}
function num(v){
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g,''));
  return isNaN(n) ? 0 : n;
}
function parseEntity(row, name, kind, province, psgc){
  const e = emptyEntity(name, kind, province, psgc);
  e.target = num(row[COL.target]);
  const rawDays = [];
  for (let i=0;i<15;i++) rawDays.push(num(row[COL.days[i]]));
  e.days[0] = rawDays[0];
  for (let i=1;i<15;i++) e.days[i] = Math.max(0, rawDays[i] - rawDays[i-1]);
  for (let w=0;w<3;w++){
    e.week[w]     = num(row[COL.weekTotal[w]]);
    e.deferred[w] = num(row[COL.weekDeferred[w]]);
    e.refusal[w]  = num(row[COL.weekRefusal[w]]);
  }
  finalizeEntity(e);
  return e;
}
function finalizeEntity(e){
  e.overall = 0;
  for (let w = 2; w >= 0; w--) if (e.week[w] > 0) { e.overall = e.week[w]; break; }
  if (e.overall > e.target && e.target > 0) e.overall = e.target;
  e.overallDeferred = 0;
  for (let w = 2; w >= 0; w--) if (e.deferred[w] > 0) { e.overallDeferred = e.deferred[w]; break; }
  e.overallRefusal = 0;
  for (let w = 2; w >= 0; w--) if (e.refusal[w] > 0) { e.overallRefusal = e.refusal[w]; break; }
  e.remaining = Math.max(0, e.target - e.overall);
  return e;
}
function weekVal(ent, w){
  if (w === 0) return ent.week[0];
  return Math.max(0, ent.week[w] - ent.week[w-1]);
}
function deferredVal(ent, w){
  if (w === 0) return ent.deferred[0];
  return Math.max(0, ent.deferred[w] - ent.deferred[w-1]);
}
function refusalVal(ent, w){
  if (w === 0) return ent.refusal[0];
  return Math.max(0, ent.refusal[w] - ent.refusal[w-1]);
}
function clipEntityToToday(e){
  if (CURRENT_DAY_IDX < 0 || CURRENT_DAY_IDX >= 14) return e;
  for (let i = CURRENT_DAY_IDX+1; i < 15; i++) e.days[i] = 0;
  for (let w = 0; w < 3; w++){
    let allFuture = true;
    for (let i = 0; i < 15; i++) if (DAYS[i].week === w+1 && i <= CURRENT_DAY_IDX) allFuture = false;
    if (allFuture) e.week[w] = 0;
  }
  return finalizeEntity(e);
}
function clipModelToToday(model){
  clipEntityToToday(model.region);
  model.provinces.forEach(clipEntityToToday);
  for (const k of Object.keys(model.lguGroups)) model.lguGroups[k].forEach(clipEntityToToday);
}
function sumEntities(list){
  const out = emptyEntity('__SUM__', 'sum');
  if (!list || !list.length) return out;
  out.name = list[0].name;
  list.forEach(e => {
    out.target += e.target;
    for (let i=0;i<15;i++) out.days[i] += e.days[i];
    for (let w=0;w<3;w++){
      out.week[w] += e.week[w];
      out.deferred[w] += e.deferred[w];
      out.refusal[w] += e.refusal[w];
    }
  });
  finalizeEntity(out);
  return out;
}
// Prefer computed (from LGUs) for counts; sheet is authoritative for target when present
function mergeEntity(computed, sheet){
  const out = computed ? Object.assign({}, computed) : emptyEntity('', 'province');
  if (sheet){
    if (sheet.target > 0) out.target = sheet.target;
    for (let i=0;i<15;i++) if (out.days[i] === 0 && sheet.days[i] > 0) out.days[i] = sheet.days[i];
    for (let w=0;w<3;w++){
      if (out.week[w] === 0 && sheet.week[w] > 0) out.week[w] = sheet.week[w];
      if (out.deferred[w] === 0 && sheet.deferred[w] > 0) out.deferred[w] = sheet.deferred[w];
      if (out.refusal[w] === 0 && sheet.refusal[w] > 0) out.refusal[w] = sheet.refusal[w];
    }
  }
  return finalizeEntity(out);
}

/* ---------------- CSV ---------------- */
function parseCSV(text){
  const rows=[]; let row=[], field='', inQ=false;
  for (let i=0;i<text.length;i++){
    const c = text[i];
    if (inQ){
      if (c === '"'){ if (text[i+1] === '"'){ field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ','){ row.push(field); field=''; }
      else if (c === '\n'){ row.push(field); rows.push(row); row=[]; field=''; }
      else if (c === '\r'){}
      else field += c;
    }
  }
  if (field !== '' || row.length){ row.push(field); rows.push(row); }
  return rows;
}

/* ---------------- Build model from sheet rows ---------------- */
function buildModelFromSheet(csvText){
  const rows = parseCSV(csvText);
  const sheetProv = {};        // key -> entity
  const sheetLgus = [];        // entities
  let sheetRegion = null;
  let currentProvince = null;

  for (const row of rows){
    const raw = String(row[COL.name] || '').trim();
    if (!raw) continue;
    const norm = normName(raw);
    const low = regName(raw);

    if (REGION_RE.test(norm)){ sheetRegion = parseEntity(row, raw, 'region'); currentProvince = null; continue; }

    if (norm === 'naga'){
      // Naga is an independent component city geographically inside Camarines Sur —
      // record it as an LGU under that province, not as its own province row.
      const e = parseEntity(row, 'City of Naga', 'lgu', 'Camarines Sur', 501724000);
      e.province = 'Camarines Sur';
      sheetLgus.push(e);
      currentProvince = 'Camarines Sur';
      continue;
    }

    const provHit = PROV_NORM[norm];
    if (provHit && currentProvince !== provHit){
      currentProvince = provHit;
      sheetProv[provHit] = parseEntity(row, raw, 'province');
      continue;
    }

    const lguHit = LGU_BY_NORM[norm];
    if (lguHit){
      const prov = currentProvince && PROV_KEYS.indexOf(currentProvince) > -1 ? currentProvince : lguHit.province;
      const e = parseEntity(row, lguHit.name, 'lgu', prov, lguHit.psgc);
      e.province = prov;
      sheetLgus.push(e);
      continue;
    }

    // Unrecognised but non-empty row inside a province section -> extra LGU
    const hasData = row.slice(COL.target).some(v => num(v) > 0);
    if (currentProvince && hasData){
      const e = parseEntity(row, raw, 'lgu', currentProvince, null);
      sheetLgus.push(e);
    }
  }

  // Group LGUs by province
  const lguGroups = {};
  PROV_KEYS.forEach(k => lguGroups[k] = []);
  sheetLgus.forEach(e => {
    if (!lguGroups[e.province]) lguGroups[e.province] = [];
    lguGroups[e.province].push(e);
  });

  // Province entities: computed from LGUs, merged with sheet rows
  const provinces = PROV_KEYS.map(key => {
    const comp = sumEntities(lguGroups[key]);
    comp.name = key; comp.kind = 'province'; comp.province = null;
    return mergeEntity(comp, sheetProv[key]);
  });

  // Region
  const regionComp = sumEntities(provinces);
  regionComp.name = 'Region V (Bicol Region)'; regionComp.kind = 'region';
  const region = mergeEntity(regionComp, sheetRegion);

  return { region, provinces, lguGroups, lguAll: sheetLgus };
}

function buildModelFromFallback(){
  const fb = LT_FALLBACK;
  const lguGroups = {}; PROV_KEYS.forEach(k => lguGroups[k] = []);
  (fb.lgus || []).forEach(e => {
    const copy = Object.assign({}, e);
    finalizeEntity(copy);
    if (!lguGroups[copy.province]) lguGroups[copy.province] = [];
    lguGroups[copy.province].push(copy);
  });
  const provinces = (fb.provinces || []).map(e => { const c = Object.assign({}, e); return finalizeEntity(c); });
  const region = Object.assign({}, fb.region);
  finalizeEntity(region);
  return { region, provinces, lguGroups, lguAll: (fb.lgus||[]).map(e => Object.assign({}, e)) };
}

/* ---------------- Load data ---------------- */
async function loadSheetCSV(){
  const urls = [];
  if (CONFIG.appsScriptUrl) urls.push(CONFIG.appsScriptUrl);
  urls.push(
    `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:csv&gid=${CONFIG.gid}`,
    `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/export?format=csv&gid=${CONFIG.gid}`
  );
  for (const url of urls){
    try{
      const res = await fetch(url, { cache:'no-store' });
      if (!res.ok) continue;
      const text = await res.text();
      if (text && /[A-Za-z]/.test(text)) return text;
    }catch(e){}
  }
  return null;
}

/* ---------------- Model ---------------- */
let MODEL = null;
let DATA_MODE = 'loading';   // live | offline

async function initData(){
  const status = document.getElementById('data-status');
  const statusText = document.getElementById('status-text');
  setStatus('loading', 'Connecting to Google Sheet…');
  let csv = null;
  try { csv = await loadSheetCSV(); } catch(e){}
  if (csv){
    try{
      MODEL = buildModelFromSheet(csv);
      clipModelToToday(MODEL);
      DATA_MODE = 'live';
      setStatus('live', 'Live · Google Sheet');
    }catch(e){
      MODEL = buildModelFromFallback();
      clipModelToToday(MODEL);
      DATA_MODE = 'offline';
      setStatus('offline', 'Parse error · sample data');
    }
  } else {
    MODEL = buildModelFromFallback();
    clipModelToToday(MODEL);
    DATA_MODE = 'offline';
    setStatus('offline', 'Offline · sample data');
  }
  document.getElementById('footer-source').textContent =
    DATA_MODE === 'live'
      ? `Data source: Google Sheet (${CONFIG.sheetId})`
      : 'Data source: local sample (data/accomplishment.js) — publish the Google Sheet for live data';
  renderAll();
}

function setStatus(cls, text){
  const st = document.getElementById('data-status');
  st.className = 'data-status ' + cls;
  document.getElementById('status-text').textContent = text;
}

/* ---------------- Formatting ---------------- */
const fmt = n => (Math.round(n) || 0).toLocaleString('en-US');
function pctFmt(part, whole){ return whole > 0 ? (part/whole*100).toFixed(1) + '%' : '0.0%'; }
function pctClass(p){ return p >= 95 ? 'good' : (p >= 50 ? 'mid' : (p > 0 ? 'low' : 'zero')); }
function progressClass(cumPct, dayIdx){
  const expected = (dayIdx + 1) * 9.5;
  if (cumPct >= expected) return 'good';
  if (cumPct >= expected * 0.75) return 'mid';
  return cumPct > 0 ? 'low' : 'zero';
}

/* ---------------- Scope ---------------- */
function makeScopes(){
  const scopes = [
    { id:'overall', label:'Current', type:'overall' },
    { id:'wk1', label:'Week 1 — Aug 10–14', type:'week', w:0 },
    { id:'wk2', label:'Week 2 — Aug 17–21', type:'week', w:1 },
    { id:'wk3', label:'Week 3 — Aug 24–28', type:'week', w:2 }
  ];
  DAYS.forEach(d => scopes.push({ id:'d'+(d.i+1), label:d.label, type:'day', i:d.i }));
  return scopes;
}
function scopeValue(ent, scope){
  if (scope.type === 'day') return ent.days[scope.i];
  if (scope.type === 'week') return weekVal(ent, scope.w);
  return ent.overall;
}

let state = {
  scope: { id:'overall', label:'Current', type:'overall' },
  metric: 'pct',          // pct | count
  hideZero: false,
  selectedProvince: null,
  mapLevel: 'region',     // region | province
  mapProvince: null,
  tableProvince: ''
};

/* ---------------- Rendering: KPI row ---------------- */
function renderKPIs(){
  const r = MODEL.region;
  const el = document.getElementById('kpi-row');
  const overallPct = r.target > 0 ? r.overall/r.target*100 : 0;
  const remPct = r.target > 0 ? r.remaining/r.target*100 : 0;
  const cards = [
    { cls:'accent', label:'Projected Target (6–59 mo)', value: fmt(r.target), sub:'Population 6–59 months' },
    { cls:'teal', label:'Total Vaccinated', value: fmt(r.overall), sub:'MR administered' },
    { cls: pctClass(overallPct), label:'Current Accomplishment', value: overallPct.toFixed(1)+'%', sub: fmt(r.overall)+' / '+fmt(r.target), bar: Math.min(overallPct,100) },
    { cls:'', label:'Deferred', value: fmt(r.overallDeferred), sub:'Current total' },
    { cls:'bad', label:'Refusal', value: fmt(r.overallRefusal), sub:'Current total' },
    { cls: remPct > 30 ? 'warn':'', label:'Remaining Unvaccinated', value: fmt(r.remaining), sub: remPct.toFixed(1)+'% of target' }
  ];
  el.innerHTML = cards.map(c => `
    <div class="kpi ${c.cls||''}">
      <span class="k-label">${c.label}</span>
      <span class="k-value">${c.value}</span>
      <span class="k-sub">${c.sub||''}</span>
      ${c.bar != null ? `<div class="k-bar"><span style="width:${Math.max(0,Math.min(100,c.bar))}%"></span></div>` : ''}
    </div>`).join('');
}

/* ---------------- Rendering: rankings ---------------- */
function rankEntities(list, scope, metric, hideZero){
  let arr = list.map(ent => {
    const v = scopeValue(ent, scope);
    return { ent, v, p: ent.target > 0 ? v/ent.target*100 : 0 };
  });
  if (hideZero) arr = arr.filter(x => x.v > 0);
  arr.sort((a,b) => (metric === 'pct' ? b.p - a.p : b.v - a.v) || a.ent.name.localeCompare(b.ent.name));
  arr.forEach((x,i) => x.rank = i+1);
  return arr;
}

function rankItemHTML(item, selected, isLgu){
  const { ent, v, p, rank } = item;
  const pct = pctFmt(v, ent.target);
  return `
    <li class="${isLgu ? 'lgu-item':'rank-item'} ${selected?'selected':''}" data-name="${ent.name}" data-kind="rank">
      <span class="rank-num">${rank}</span>
      <span class="rank-info">
        <span class="rank-name">${ent.name}${isLgu ? '' : `<span class="tag">${ent.province ? 'Ind. City' : 'Province'}</span>`}</span>
        <span class="rank-track"><span style="width:${Math.max(0,Math.min(100,p))}%"></span></span>
      </span>
      <span class="rank-nums">
        <span class="rank-count">${fmt(v)}</span>
        <span class="rank-pct ${pctClass(p)}">${pct}</span>
      </span>
    </li>`;
}

function renderRankings(){
  const scopes = makeScopes();
  const sel = document.getElementById('scope-select');
  sel.innerHTML = scopes.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
  sel.value = state.scope.id;

  const heading = document.getElementById('rank-heading');
  const sub = document.getElementById('rank-sub');
  const scopeLabel = state.scope.type==='overall' ? 'Current' : (state.scope.type==='week' ? WEEK_LABELS[state.scope.w] : state.scope.label);
  heading.textContent = 'Province Rankings';
  sub.textContent = `${scopeLabel} · ${state.metric==='pct' ? 'by accomplishment %' : 'by no. vaccinated'}`;

  const ranked = rankEntities(MODEL.provinces, state.scope, state.metric, false);
  const list = document.getElementById('province-rank-list');
  list.innerHTML = ranked.map(item => rankItemHTML(item, item.ent.name === state.selectedProvince, false)).join('');

  // show LGU panel for selected province
  if (state.selectedProvince){
    const provEnt = MODEL.provinces.find(p => p.name === state.selectedProvince);
    if (provEnt) renderLGUList(provEnt);
  } else {
    renderLGUEmpty();
  }

  list.querySelectorAll('li[data-kind="rank"]').forEach(li => {
    li.addEventListener('click', () => {
      state.selectedProvince = li.dataset.name;
      renderRankings();
    });
  });
}

function renderLGUEmpty(){
  document.getElementById('lgu-title').textContent = 'Select a province';
  document.getElementById('lgu-sub').textContent = '';
  document.getElementById('lgu-list').innerHTML =
    `<p class="lgu-empty">Click a province on the left to see its municipalities and cities with daily data. Click any LGU for the full breakdown.</p>`;
}

function renderLGUList(provEnt){
  document.getElementById('lgu-title').textContent = provEnt.name;
  document.getElementById('lgu-sub').textContent =
    `Target ${fmt(provEnt.target)} · Vaccinated ${fmt(provEnt.overall)} · ${pctFmt(provEnt.overall, provEnt.target)}`;
  const wrap = document.getElementById('lgu-list');
  const group = MODEL.lguGroups[provEnt.name] || [];
  if (!group.length){
    wrap.innerHTML = `<div class="lgu-empty">
      <strong>${provEnt.name}</strong> is an independent component city.
      <br><br><button class="ghost-btn" id="view-prov-detail">View full data detail</button></div>`;
    const btn = wrap.querySelector('#view-prov-detail');
    if (btn) btn.addEventListener('click', () => openLGUModal(provEnt));
    return;
  }
  const ranked = rankEntities(group, state.scope, state.metric, state.hideZero);
  wrap.innerHTML = ranked.map(item => rankItemHTML(item, false, true)).join('');
  wrap.querySelectorAll('li[data-kind="rank"]').forEach(li => {
    li.addEventListener('click', () => {
      const ent = group.find(g => g.name === li.dataset.name);
      if (ent) openLGUModal(ent);
    });
  });
}

/* ---------------- Rendering: LGU modal ---------------- */
function openLGUModal(ent){
  const kicker = document.getElementById('lgu-modal-kicker');
  kicker.textContent = ent.kind === 'province'
    ? 'PROVINCE'
    : 'LGU · ' + ent.province.toUpperCase();
  document.getElementById('lgu-modal-title').textContent = ent.name;

  const pct = ent.target > 0 ? ent.overall/ent.target*100 : 0;
  const kpis = [
    ['Projected Target', fmt(ent.target), '6–59 months'],
    ['Vaccinated (Current)', fmt(ent.overall), 'MR administered'],
    ['Accomplishment', pct.toFixed(1)+'%', 'of target'],
    ['Remaining', fmt(ent.remaining), 'unvaccinated'],
    ['Deferred', fmt(ent.overallDeferred), 'current'],
    ['Refusal', fmt(ent.overallRefusal), 'current']
  ];
  document.getElementById('lgu-modal-kpis').innerHTML = kpis.map(k =>
    `<div class="modal-kpi"><span class="k-label">${k[0]}</span><span class="k-value">${k[1]}</span><span class="k-sub">${k[2]}</span></div>`
  ).join('');

  // daily bar chart
  const activeDays = CURRENT_DAY_IDX >= 0 ? ent.days.slice(0, CURRENT_DAY_IDX + 1) : ent.days;
  const maxDay = Math.max.apply(null, activeDays) || 1;
  let cumSumBar = 0;
  const chart = document.getElementById('lgu-daily-chart');
  chart.innerHTML = DAYS.map((d,idx) => {
    const isFuture = CURRENT_DAY_IDX >= 0 && idx > CURRENT_DAY_IDX;
    const v = isFuture ? 0 : ent.days[idx];
    if (!isFuture) cumSumBar += v;
    const h = isFuture ? 2 : Math.max(v/maxDay*100, v>0 ? 4 : 1);
    const cumP = isFuture ? 0 : pctOf(cumSumBar, ent.target);
    const cls = isFuture ? 'bar-future-col' : (v===0 ? 'bar-empty' : '');
    return `<div class="bar-wrap ${isFuture ? 'bar-future' : ''}" title="${d.label}: ${isFuture ? 'Upcoming' : fmt(v) + ' (' + pctFmt(cumSumBar, ent.target) + ' cumulative)'}">
      <span class="bar-val">${!isFuture && v ? fmt(v) : ''}</span>
      <span class="bar-col ${cls}" style="height:${h}%"></span>
      <span class="bar-day">${d.label}</span>
    </div>`;
  }).join('');

  // daily table
  let cumSum = 0;
  const dailyRows = DAYS.map((d, idx) => {
    const isFuture = CURRENT_DAY_IDX >= 0 && idx > CURRENT_DAY_IDX;
    if (isFuture) {
      return `<tr class="future-day">
        <td>${d.label}</td>
        <td class="num">&mdash;</td>
        <td class="pct">&mdash;</td>
      </tr>`;
    }
    cumSum += ent.days[d.i];
    const cumP = pctOf(cumSum, ent.target);
    return `<tr>
      <td>${d.label}</td>
      <td class="num">${fmt(ent.days[d.i])}</td>
      <td class="pct ${progressClass(cumP, idx)}">${pctFmt(cumSum, ent.target)}</td>
    </tr>`;
  }).join('');
  document.getElementById('lgu-daily-table').innerHTML =
    `<thead><tr><th>Date</th><th>Vaccinated</th><th>Accomplishment</th></tr></thead>
     <tbody>${dailyRows}</tbody>`;

  // weekly + overall table
  const weekRows = WEEK_LABELS.map((wl, w) => {
    const wv = weekVal(ent, w);
    const dv = deferredVal(ent, w);
    const rv = refusalVal(ent, w);
    return `<tr>
      <td>${wl}</td>
      <td class="num">${fmt(wv)}</td>
      <td class="pct ${pctClass(pctOf(wv, ent.target))}">${pctFmt(wv, ent.target)}</td>
      <td class="num">${fmt(dv)}</td>
      <td class="num">${fmt(rv)}</td>
    </tr>`;
  }).join('');
  document.getElementById('lgu-week-table').innerHTML =
    `<thead><tr><th>Period</th><th>Total</th><th>% of target</th><th>Deferred</th><th>Refusal</th></tr></thead>
     <tbody>${weekRows}</tbody>`;

  document.getElementById('lgu-modal').classList.remove('hidden');
}
function pctOf(part, whole){ return whole > 0 ? part/whole*100 : 0; }

/* ---------------- Rendering: data table ---------------- */
function renderTable(){
  const filter = document.getElementById('table-province').value;
  let rows = [];

  rows.push(makeTableRow(MODEL.region, 'region'));

  MODEL.provinces.forEach(prov => {
    if (filter && prov.name !== filter) return;
    rows.push(makeTableRow(prov, 'group'));
    const group = MODEL.lguGroups[prov.name] || [];
    group.forEach(lgu => rows.push(makeTableRow(lgu, 'plain')));
  });

  const table = document.getElementById('data-table');
  const dayHeaders = DAYS.map(d => `<th rowspan="2">${d.label}</th>`).join('');
  const weekHeaders = [0,1,2].map(w =>
    `<th class="grp" colspan="3">${WEEK_SHORT[w]}</th>`).join('');

  table.innerHTML = `
    <thead>
      <tr>
        <th class="sticky-col" rowspan="2">Area / LGU</th>
        <th rowspan="2">Target<br>6–59 mo</th>
        ${dayHeaders}
        ${weekHeaders}
      </tr>
      <tr>
        ${[0,1,2].map(w=>`<th>Tot</th><th>Def</th><th>Ref</th>`).join('')}
      </tr>
    </thead>
    <tbody>${rows.join('')}</tbody>`;
}

function makeTableRow(ent, kind){
  const pct = pctOf(ent.overall, ent.target);
  let cumSum = 0;
  const days = ent.days.map((v, i) => {
    cumSum += v;
    const cumP = pctOf(cumSum, ent.target);
    return `<td><span class="num">${fmt(v)}</span> <span class="pct ${progressClass(cumP, i)}">${pctFmt(cumSum, ent.target)}</span></td>`;
  }).join('');
  const weeks = [0,1,2].map(w => {
    const wv = weekVal(ent, w);
    const dv = deferredVal(ent, w);
    const rv = refusalVal(ent, w);
    const wp = pctOf(wv, ent.target);
    return `<td><span class="num">${fmt(wv)}</span> <span class="pct ${pctClass(wp)}">${pctFmt(wv, ent.target)}</span></td>
            <td class="num">${fmt(dv)}</td>
            <td class="num">${fmt(rv)}</td>`;
  }).join('');
  const cls = kind === 'region' ? 'region-row' : (kind === 'group' ? 'group-row' : '');
  const name = kind === 'group' ? '▸ ' + ent.name : ent.name;
  return `<tr class="${cls}" data-name="${ent.name}" data-kind="${kind}">
      <th class="sticky-col">${name}</th>
      <td class="num">${fmt(ent.target)}</td>
      ${days}
      ${weeks}
    </tr>`;
}

/* ---------------- Map ---------------- */
const map = L.map('map', { zoomControl:true, minZoom:6, maxZoom:15 }).setView([13.42,123.4], 8);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains:'abcd', maxZoom:19
}).addTo(map);
map.createPane('labelsPane');
map.getPane('labelsPane').style.zIndex = 550;
map.getPane('labelsPane').style.pointerEvents = 'none';
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
  subdomains:'abcd', pane:'labelsPane', maxZoom:19
}).addTo(map);

// Map opens as the default tab; re-measure once webfonts/layout settle so the
// tile grid never gets stuck sized to a mid-layout-shift viewport.
window.addEventListener('load', () => setTimeout(() => map.invalidateSize(), 80));
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => map.invalidateSize());

const REGION_BOUNDS = L.geoJSON(PROVINCES_DATA).getBounds();
let provinceLayer = null, muniLayer = null;

function fillFor(p){
  if (p >= 95) return { color:'#14532d', fillColor:'#22c55e' };
  if (p >= 50) return { color:'#92400e', fillColor:'#f59e0b' };
  if (p > 0)  return { color:'#7f1d1d', fillColor:'#ef4444' };
  return { color:'#7c8aa0', fillColor:'#d8dee9' };
}
function geoStyle(feature, opacity){
  const ent = entityByMuni(feature.properties);
  const p = ent && ent.target > 0 ? ent.overall/ent.target*100 : 0;
  const f = fillFor(p);
  return { color:f.color, weight: feature.properties.psgc && feature.properties.province ? 1.4 : 2,
    fillColor:f.fillColor, fillOpacity: opacity != null ? opacity : (p>0 ? .55 : .25) };
}
function entityByMuni(props){
  if (!props) return null;
  const byPsgc = MODEL.lguPsgcLookup || {};
  let ent = byPsgc[props.psgc];
  if (!ent){
    if (props.level === 'province') ent = MODEL.provinces.find(p => p.name === props.name);
    else ent = MODEL.provinces.find(p => p.name === props.province);
  }
  return ent;
}

function clearLayers(){
  if (muniLayer){ map.removeLayer(muniLayer); muniLayer = null; }
  if (provinceLayer){ map.removeLayer(provinceLayer); provinceLayer = null; }
}

function hideMapLoading(){
  const el = document.getElementById('map-loading');
  if (el) el.classList.add('hidden');
}

function showProvinces(){
  if (!MODEL) return;   // guard: don't draw until data (live or fallback) is ready
  clearLayers();
  state.mapLevel = 'region';
  hideMapCard();
  hideMapLoading();
  provinceLayer = L.geoJSON(PROVINCES_DATA, {
    style: f => geoStyle(f, 0.55),
    onEachFeature: (feature, layer) => {
      const ent = MODEL.provinces.find(p => p.name === feature.properties.name) || null;
      const p = ent && ent.target > 0 ? ent.overall/ent.target*100 : 0;
      layer.bindTooltip(`${feature.properties.name} — ${pctFmt(ent ? ent.overall : 0, ent ? ent.target : 0)}`, { className:'bb-label', sticky:true });
      layer.on('click', () => selectProvinceMap(feature.properties.name, layer));
    }
  }).addTo(map);
  map.fitBounds(REGION_BOUNDS, { padding:[24,24] });
}

function showMunicipalities(provinceName){
  if (muniLayer){ map.removeLayer(muniLayer); muniLayer = null; }
  const feats = MUNICIPALITIES_DATA.features.filter(f => f.properties.province === provinceName);
  muniLayer = L.geoJSON({ type:'FeatureCollection', features:feats }, {
    style: f => geoStyle(f),
    onEachFeature: (feature, layer) => {
      const ent = entityByMuni(feature.properties);
      layer.bindTooltip(`${feature.properties.name} — ${pctFmt(ent ? ent.overall : 0, ent ? ent.target : 0)}`, { className:'bb-label', sticky:true });
      layer.on('click', (e) => { L.DomEvent.stopPropagation(e); openLGUModal(ent); });
    }
  }).addTo(map);
}

function selectProvinceMap(provinceName, layer){
  state.mapLevel = 'province';
  state.mapProvince = provinceName;
  showMunicipalities(provinceName);
  if (layer) map.fitBounds(layer.getBounds(), { padding:[40,40] });
  showMapCard(provinceName);
}

function showMapCard(provinceName){
  const prov = MODEL.provinces.find(p => p.name === provinceName);
  if (!prov) return;
  const card = document.getElementById('map-card');
  document.getElementById('map-card-title').textContent = prov.name;
  const p = prov.target > 0 ? prov.overall/prov.target*100 : 0;
  document.getElementById('map-card-body').innerHTML = `
    <div class="map-card-kpis">
      <div class="map-card-kpi"><span class="k-label">Target</span><span class="k-value">${fmt(prov.target)}</span><span class="k-sub">6–59 months</span></div>
      <div class="map-card-kpi"><span class="k-label">Vaccinated</span><span class="k-value">${fmt(prov.overall)}</span><span class="k-sub">MR administered</span></div>
      <div class="map-card-kpi"><span class="k-label">Accomplishment</span><span class="k-value">${p.toFixed(1)}%</span><span class="k-sub">of target</span></div>
      <div class="map-card-kpi"><span class="k-label">Remaining</span><span class="k-value">${fmt(prov.remaining)}</span><span class="k-sub">unvaccinated</span></div>
    </div>
    <ul class="map-card-list">${provinceLGURankRows(prov)}</ul>
    <div class="map-card-note">Click an LGU for the full daily breakdown.</div>`;
  card.classList.remove('hidden');

  card.querySelectorAll('li').forEach(li => li.addEventListener('click', () => {
    const ent = (MODEL.lguGroups[provinceName]||[]).find(g => g.name === li.dataset.name);
    if (ent) openLGUModal(ent);
  }));
}
function provinceLGURankRows(prov){
  const group = MODEL.lguGroups[prov.name] || [];
  const ranked = rankEntities(group, { type:'overall' }, 'pct', false);
  return ranked.map(item => {
    const p = pctOf(item.v, item.ent.target);
    return `<li data-name="${item.ent.name}">
      <span class="mc-name">${item.rank}. ${item.ent.name}</span>
      <span class="mc-pct ${pctClass(p)}">${p.toFixed(1)}%</span>
    </li>`;
  }).join('') || '<li><span class="mc-name">Independent component city</span></li>';
}
function hideMapCard(){ document.getElementById('map-card').classList.add('hidden'); }

/* ---------------- CSV export ---------------- */
function exportCSV(){
  const esc = v => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  };
  const header = ['Name','Kind','Province','Target',
    ...DAYS.map(d=>d.label), ...WEEK_LABELS, 'Wk1 Def','Wk1 Ref','Wk2 Def','Wk2 Ref','Wk3 Def','Wk3 Ref'];
  const lines = [header.map(esc).join(',')];
  const push = e => {
    lines.push([esc(e.name), e.kind, esc(e.province||''), e.target,
      ...e.days,
      weekVal(e,0), weekVal(e,1), weekVal(e,2),
      deferredVal(e,0), refusalVal(e,0), deferredVal(e,1), refusalVal(e,1), deferredVal(e,2), refusalVal(e,2)
    ].map(esc).join(','));
  };
  push(MODEL.region);
  MODEL.provinces.forEach(prov => {
    push(prov);
    (MODEL.lguGroups[prov.name]||[]).forEach(push);
  });
  const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `LIGTAS_TIGDAS_RegionV_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------------- Tab switching ---------------- */
function switchTab(name){
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-'+name));
  if (name === 'map'){
    if (!provinceLayer) showProvinces();   // no-ops safely if data isn't ready yet
    setTimeout(() => map.invalidateSize(), 60);
  }
}

/* ---------------- Wire-up ---------------- */
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
document.getElementById('reset-btn').addEventListener('click', showProvinces);
document.getElementById('map-card-close').addEventListener('click', hideMapCard);
document.getElementById('export-btn').addEventListener('click', exportCSV);

document.getElementById('scope-select').addEventListener('change', e => {
  const scopes = makeScopes();
  state.scope = scopes.find(s => s.id === e.target.value) || scopes[0];
  renderRankings();
});
document.getElementById('metric-select').addEventListener('change', e => { state.metric = e.target.value; renderRankings(); });
document.getElementById('cutoff-toggle').addEventListener('change', e => { state.hideZero = e.target.checked; renderRankings(); });

// province filter in table
const provFilter = document.getElementById('table-province');
['Albay','Camarines Norte','Camarines Sur','Catanduanes','Masbate','Sorsogon'].forEach(p => {
  provFilter.innerHTML += `<option value="${p}">${p}</option>`;
});
provFilter.addEventListener('change', e => { state.tableProvince = e.target.value; renderTable(); });

// modals
document.getElementById('lgu-modal-close').addEventListener('click', () => document.getElementById('lgu-modal').classList.add('hidden'));
document.getElementById('lgu-modal').addEventListener('click', e => { if (e.target === document.getElementById('lgu-modal')) document.getElementById('lgu-modal').classList.add('hidden'); });
document.getElementById('about-btn').addEventListener('click', () => document.getElementById('about-modal').classList.remove('hidden'));
document.getElementById('about-close').addEventListener('click', () => document.getElementById('about-modal').classList.add('hidden'));
document.getElementById('about-modal').addEventListener('click', e => { if (e.target === document.getElementById('about-modal')) document.getElementById('about-modal').classList.add('hidden'); });

document.getElementById('data-status').addEventListener('click', () => {
  if (DATA_MODE !== 'loading') initData();
});

window.addEventListener('resize', () => {
  map.invalidateSize();
  clearTimeout(window._resizeTimer);
  window._resizeTimer = setTimeout(() => map.invalidateSize(), 200);
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => map.invalidateSize());
}

/* ---------------- Boot ---------------- */
function renderAll(){
  MODEL.lguPsgcLookup = {};
  MODEL.lguAll.forEach(e => { if (e.psgc) MODEL.lguPsgcLookup[e.psgc] = e; });
  renderKPIs();
  renderRankings();
  renderTable();
  showProvinces();
}

initData();
