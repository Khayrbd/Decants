/* ============================================================
   KHAYR shop script (version 6) — Perfume Decants only.
   Pages tell it who they are with <body data-page="perfume|bottles|privacy">.
   Nothing secret lives here: prices, stock and discounts are checked again on the server.
   ============================================================ */
(function(){
'use strict';
const CFG = window.SHOP_CONFIG || {};
const SITE = window.SITE_CONFIG || {};
const SB = CFG.supabase || {};
const SHOP = CFG.shopName || 'KHAYR';
const PAGE = document.body.dataset.page || 'perfume';
const BUCKET = SB.imageBucket || 'perfume-images';
const SB_URL = String(SB.url || '').replace(/\/$/, '');
const sbReady = () => !!(SB_URL && SB.anonKey && !/PASTE-|YOUR-/.test(SB_URL + SB.anonKey));
const API = SB_URL ? SB_URL + '/functions/v1/khayr-api' : '';
const SIZES = [3, 6, 10, 15, 30];
const CATS = [['niche', 'Niche'], ['designer', 'Designer'], ['middle_eastern', 'Middle Eastern']];
const GENDERS = [['male', 'Male'], ['female', 'Female'], ['unisex', 'Unisex']];
const SEASONS = [['summer', 'Summer'], ['winter', 'Winter'], ['all', 'All season']];
const gLabel = g => (GENDERS.find(x => x[0] === g) || [])[1] || '';
const sLabel = v => (SEASONS.find(x => x[0] === v) || [])[1] || '';

/* ---------- small helpers ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const price = n => String(Math.round(Number(n) || 0));            // 1500  (no commas, no currency)
const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
const ls = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
const ss = {
  get(k, d){ try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return d; } },
  set(k, v){ try { sessionStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { sessionStorage.removeItem(k); } catch(e){} }
};
const normCat = c => String(c || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const catLabel = c => (CATS.find(x => x[0] === c) || [])[1] || '';
const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();   // Rosé = Rose
const houseKey = h => norm(h);
function newId(){
  try { if(crypto.randomUUID) return crypto.randomUUID(); } catch(e){}
  const b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

/* ---------- Meta Pixel (only if a Pixel ID is set in site-config.js) ---------- */
const PIXEL = String(SITE.metaPixelId || '').replace(/\D/g, '');
const adsOff = () => { try { return localStorage.getItem('khayr_ads_off') === '1'; } catch(e){ return false; } };
window.__khayrEvents = window.__khayrEvents || [];
function initPixel(){
  if(!PIXEL || adsOff()) return;
  /* Meta's standard loader */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', PIXEL);
  px('PageView');
}
function px(name, data, eventId, custom){
  if(!PIXEL || adsOff()) return;
  window.__khayrEvents.push({name, data: data || {}, eventId: eventId || null});
  try {
    if(!window.fbq) return;
    const args = [custom ? 'trackCustom' : 'track', name];
    if(data) args.push(data); else if(eventId) args.push({});
    if(eventId) args.push({eventID: eventId});
    window.fbq.apply(window, args);
  } catch(e){}
}
const pxItem = (p, size, qty) => ({id: p.id, quantity: qty || 1, item_price: priceOf(p, size)});

/* ---------- where the visitor came from (kept 7 days, sent with the order) ---------- */
function cookie(name){ const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
function captureAttribution(){
  const u = new URLSearchParams(location.search), now = Date.now();
  let a = ls.get('khayr_attr', null);
  if(a && now - (a.at || 0) > 7 * 864e5) a = null;
  const fresh = {};
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].forEach(k => { const v = u.get(k); if(v) fresh[k] = v.slice(0, 300); });
  if(Object.keys(fresh).length || !a){
    let ref = '';
    try { if(document.referrer && new URL(document.referrer).host !== location.host) ref = document.referrer.slice(0, 300); } catch(e){}
    a = {at: now, data: {...fresh, landing_page: (location.pathname + location.search).slice(0, 300), referrer: ref, first_seen: new Date(now).toISOString()}};
    ls.set('khayr_attr', a);
  }
  if(fresh.fbclid) ls.set('khayr_fbc', {v: `fb.1.${now}.${fresh.fbclid}`, at: now});
  return a.data;
}
const ATTR = captureAttribution();
function fbcValue(){
  const c = cookie('_fbc'); if(c) return c;
  const s = ls.get('khayr_fbc', null);
  return s && Date.now() - s.at < 90 * 864e5 ? s.v : '';
}

/* ---------- data ---------- */
const GEN_DEFAULTS = {whatsapp:'8801673080800', orderNote:'', sizesEnabled:{}, houseOrder:[], payment:{advance:150, fullDiscountPct:1, qrs:[]},
                      delivery:{insideSylhet:50, outsideSylhet:100, freeOver:3000}};
let GEN = {...GEN_DEFAULTS};
let ALL = [];                                       // every visible perfume
let products = [];                                  // perfumes with at least one size shown

const priceOf = (p, s) => p ? Number((p.prices || {})[s]) || 0 : 0;
const sizeOn = s => (GEN.sizesEnabled || {})[s] !== false;
const activeSizes = () => SIZES.filter(sizeOn);
const sizesFor = p => activeSizes().filter(s => (p.sizes || {})[s] !== false && priceOf(p, s) > 0);
const sizeOut = (p, s) => !!(p.stock_out || (p.stock_out_sizes || {})[s] === true || (p.auto_out || {})[s] === true);
const canBuy = (p, s) => !!p && sizesFor(p).includes(s) && !sizeOut(p, s);
const buySizes = p => sizesFor(p).filter(s => !sizeOut(p, s));
const allOut = p => !buySizes(p).length;
const findP = id => ALL.find(p => p.id === id);
const imgUrl = path => path && SB_URL ? `${SB_URL}/storage/v1/object/public/${BUCKET}/${String(path).split('/').map(encodeURIComponent).join('/')}` : '';
const pct = () => Math.max(0, Math.min(50, Number((GEN.payment || {}).fullDiscountPct ?? 1) || 0));
const dnum = (v, d) => { const n = Number(v); return v === undefined || v === null || v === '' || !Number.isFinite(n) ? d : Math.max(0, Math.round(n)); };
const freeOver = () => dnum((GEN.delivery || {}).freeOver, 3000);
/* Delivery charge, the same rule as the server: free when the perfumes cost freeOver or more. */
function deliveryFee(area, sub){
  const d = GEN.delivery || {};
  if(area !== 'Inside Sylhet' && area !== 'Outside Sylhet') return null;
  if(freeOver() > 0 && sub >= freeOver()) return 0;
  return area === 'Inside Sylhet' ? dnum(d.insideSylhet, 50) : dnum(d.outsideSylhet, 100);
}
const fullDiscount = sub => Math.round(sub * pct() / 100);

async function fetchData(){
  if(sbReady()){
    try{
      const h = {apikey: SB.anonKey, Authorization: 'Bearer ' + SB.anonKey};
      const base = SB_URL + '/rest/v1/';
      const v6 = 'id,product_type,number,name,house,category,gender,season,similar_to,fragrantica_url,prices,sizes,visible,image_path,thumb_path,stock_out,stock_out_sizes,auto_out';
      const v5 = 'id,product_type,number,name,brand,house,category,prices,sizes,visible,image_path,thumb_path,stock_out,stock_out_sizes,auto_out';
      const v4 = 'id,product_type,number,name,brand,category,prices,sizes,visible,image_path,thumb_path';
      const get = c => fetch(base + 'products?select=' + c + '&visible=eq.true&order=number.asc', {headers: h, cache: 'no-store'});
      const [pr0, st] = await Promise.all([get(v6), fetch(base + 'settings?select=id,data&id=eq.1', {headers: h, cache: 'no-store'})]);
      let pr = pr0;
      if(pr.status === 400) pr = await get(v5);                                   // database not upgraded yet
      if(pr.status === 400) pr = await get(v4);
      if(pr.ok && st.ok){
        const list = await pr.json(), rows = await st.json();
        if(list.length) return {settings: (rows[0] && rows[0].data) || {}, products: list};
      }
    }catch(e){ /* use the backup list below */ }
  }
  const r = await fetch('products.json?v=' + Date.now(), {cache: 'no-store'});
  if(!r.ok) throw new Error('load');
  const j = await r.json();
  if(j.settings && 'perfume' in j.settings) j.settings = j.settings.perfume || {};
  return j;
}
function applyData(data){
  const s = data.settings || {};
  GEN = {...GEN_DEFAULTS, ...s, payment: {...GEN_DEFAULTS.payment, ...(s.payment || {})}, delivery: {...GEN_DEFAULTS.delivery, ...(s.delivery || {})}};
  ALL = (data.products || [])
    .filter(p => (p.product_type || 'perfume') === 'perfume' && p.visible !== false)
    .map((p, i) => ({...p, no: Number(p.number) || (i + 1), prices: p.prices || {}, sizes: p.sizes || {}, category: normCat(p.category),
                     house: clean(p.house), gender: p.gender || '', season: p.season || '', similar_to: clean(p.similar_to), fragrantica_url: /^https:\/\//.test(p.fragrantica_url || '') ? p.fragrantica_url : '',
                     stock_out_sizes: p.stock_out_sizes || {}, auto_out: p.auto_out || {}}));
  products = ALL.filter(p => sizesFor(p).length);
}

/* Bottle Photos (table gallery_photos). Empty list if not set up yet. */
async function fetchGallery(){
  if(!sbReady()) return [];
  try{
    const r = await fetch(SB_URL + '/rest/v1/gallery_photos?select=id,kind,image_path,thumb_path,caption,sort_order&kind=eq.decant&visible=eq.true&order=sort_order.asc,created_at.asc',
      {headers: {apikey: SB.anonKey, Authorization: 'Bearer ' + SB.anonKey}, cache: 'no-store'});
    if(!r.ok) return [];
    const list = await r.json();
    return Array.isArray(list) ? list.filter(g => g && g.image_path) : [];
  }catch(e){ return []; }
}

/* ---------- start ---------- */
const params = new URLSearchParams(location.search);
async function load(){
  initPixel();
  let data;
  try { data = await fetchData(); }
  catch(e){ const g = $('grid'); if(g) g.innerHTML = '<div class="loading">The price list could not load. Check your internet and refresh the page.</div>'; return; }
  applyData(data);
  const wa = String(GEN.whatsapp).replace(/\D/g, '');
  document.querySelectorAll('[data-wa]').forEach(a => { a.href = 'https://wa.me/' + wa; a.textContent = '+' + wa; });
  loadCart();
  if(PAGE === 'perfume') initShop();
  else if(PAGE === 'bottles') initBottles();
  updateCartUI();
  restoreLastAction();
}

/* ================= PERFUME LIST ================= */
const state = {q:'', size:'all', cat:'all', house:'all', gender:'all', season:'all', sort:'number', sel:{}, touched:{}};
function houseRanks(){
  const order = (GEN.houseOrder || []).map(houseKey);
  const names = [...new Set(products.map(p => p.house).filter(Boolean))];
  const byKey = new Map();
  names.forEach(n => { const k = houseKey(n); if(!byKey.has(k)) byKey.set(k, n); });
  const keys = [...byKey.keys()].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if(ia > -1 || ib > -1) return (ia > -1 ? ia : 1e6) - (ib > -1 ? ib : 1e6) || a.localeCompare(b);
    return a.localeCompare(b);
  });
  return {keys, label: k => byKey.get(k) || 'Other', rank: k => { const i = keys.indexOf(k); return i > -1 ? i : 1e6; }};
}
let HR = null;
function initShop(){
  HR = houseRanks();
  const pid = params.get('product');
  const cat = normCat(params.get('category'));
  if(cat && CATS.some(c => c[0] === cat)) state.cat = cat;
  const size = Number(params.get('size'));
  if(size && activeSizes().includes(size)) state.size = size;
  const gq = String(params.get('gender') || '').toLowerCase(), sq = String(params.get('season') || '').toLowerCase();
  if(sq === 'summer' || sq === 'winter') state.season = sq;
  if(params.get('q')){ state.q = params.get('q').slice(0, 80); $('q').value = state.q; $('searchBox').classList.add('has'); }
  if(!products.length){
    $('tools').hidden = true; $('catFilter').hidden = true; $('gsFilter').hidden = true; $('metaRow').hidden = true;
    $('grid').innerHTML = `<div class="empty"><strong>Perfumes are coming soon.</strong><p>Please check back shortly, or message us on WhatsApp.</p></div>`;
    return;
  }
  buildFilters();
  bindShop();
  render();
  if(pid){
    const p = products.find(x => x.id === pid);
    if(p) showProduct(p);
    else toast('This product is not available right now.');
  }
}
function showProduct(p){
  if(!visibleList().includes(p)){ state.q = ''; state.size = 'all'; state.cat = 'all'; state.house = 'all'; state.gender = 'all'; state.season = 'all'; $('q').value = ''; $('searchBox').classList.remove('has'); buildFilters(); render(); }
  const el = document.querySelector(`[data-card="${CSS.escape(p.id)}"]`);
  if(el){
    el.classList.add('hl');
    setTimeout(() => el.scrollIntoView({block: 'center', behavior: 'smooth'}), 60);
    setTimeout(() => { const e2 = document.querySelector(`[data-card="${CSS.escape(p.id)}"]`); if(e2) e2.classList.remove('hl'); }, 4500);
  }
  viewContent(p);
}
function viewContent(p){
  const sizes = buySizes(p);
  px('ViewContent', {content_ids: [p.id], content_type: 'product', content_name: p.name, content_category: p.house || 'perfume',
    value: sizes.length ? Math.min(...sizes.map(s => priceOf(p, s))) : 0, currency: 'BDT'});
}
function buildFilters(){
  const sizes = activeSizes();
  if(state.size !== 'all' && !sizes.includes(state.size)) state.size = 'all';
  $('sizeFilter').innerHTML = ['all', ...sizes].map(s =>
    `<button class="chip" type="button" data-size="${s}" aria-pressed="${s === state.size}">${s === 'all' ? 'All sizes' : s + 'ml'}</button>`).join('');
  const cats = CATS.filter(([c]) => products.some(p => p.category === c) || state.cat === c);
  $('catFilter').hidden = !cats.length;
  $('catFilter').innerHTML = [['all', 'All Perfumes'], ...cats].map(([c, label]) =>
    `<button class="chip" type="button" data-cat="${c}" aria-pressed="${c === state.cat}">${esc(label)}</button>`).join('');
  const gs = [...SEASONS.filter(([v]) => v !== 'all' && products.some(p => p.season === v)).map(([v, l]) => ['s:' + v, l])];
  $('gsFilter').hidden = !gs.length;
  $('gsFilter').innerHTML = gs.map(([k, l]) => `<button class="chip" type="button" data-gs="${k}" aria-pressed="${k === 'g:' + state.gender || k === 's:' + state.season}">${esc(l)}</button>`).join('');
  const hasOther = products.some(p => !p.house);
  const opts = HR.keys.map(k => [k, HR.label(k)]).concat(hasOther && HR.keys.length ? [['other', 'Other']] : []);
  $('houseSel').hidden = true;    // one list for everyone, no house groups
  $('houseSel').innerHTML = `<option value="all">All houses</option>` + opts.map(([k, l]) => `<option value="${esc(k)}" ${k === state.house ? 'selected' : ''}>${esc(l)}</option>`).join('');
  $('sort').value = state.sort;
}
function syncUrl(){
  try{
    const u = new URLSearchParams(location.search);
    u.delete('product');
    state.cat !== 'all' ? u.set('category', state.cat) : u.delete('category');
    state.size !== 'all' ? u.set('size', state.size) : u.delete('size');
    state.house !== 'all' ? u.set('house', state.house === 'other' ? 'other' : HR.label(state.house)) : u.delete('house');
    state.gender !== 'all' ? u.set('gender', state.gender) : u.delete('gender');
    state.season !== 'all' ? u.set('season', state.season) : u.delete('season');
    clean(state.q) ? u.set('q', clean(state.q)) : u.delete('q');
    const q = u.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  }catch(e){}
}
function clearFilters(){
  state.q = ''; state.size = 'all'; state.cat = 'all'; state.house = 'all'; state.gender = 'all'; state.season = 'all'; state.touched = {};
  $('q').value = ''; $('searchBox').classList.remove('has');
  buildFilters(); render(); syncUrl();
}
function bindShop(){
  $('sizeFilter').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if(!b) return;
    state.size = b.dataset.size === 'all' ? 'all' : Number(b.dataset.size);
    state.touched = {};
    [...$('sizeFilter').children].forEach(x => x.setAttribute('aria-pressed', x === b));
    render(); syncUrl();
  });
  $('catFilter').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if(!b) return;
    state.cat = b.dataset.cat;
    [...$('catFilter').children].forEach(x => x.setAttribute('aria-pressed', x === b));
    render(); syncUrl();
  });
  $('houseSel').addEventListener('change', e => { state.house = e.target.value; render(); syncUrl(); });
  $('gsFilter').addEventListener('click', e => {
    const b = e.target.closest('[data-gs]'); if(!b) return;
    const [k, v] = b.dataset.gs.split(':');
    if(k === 'g') state.gender = state.gender === v ? 'all' : v; else state.season = state.season === v ? 'all' : v;
    buildFilters(); render(); syncUrl();
  });
  let qt;
  $('q').addEventListener('input', e => {
    $('searchBox').classList.toggle('has', !!e.target.value);
    searchEvent(e.target.value);
    clearTimeout(qt); qt = setTimeout(() => { state.q = e.target.value; render(); syncUrl(); }, 80);
  });
  $('q').addEventListener('keydown', e => { if(e.key === 'Enter') e.target.blur(); });
  $('clearQ').addEventListener('click', e => { e.preventDefault(); $('q').value = ''; state.q = ''; $('searchBox').classList.remove('has'); render(); syncUrl(); $('q').focus(); });
  $('sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $('clearF').addEventListener('click', clearFilters);
  const grid = $('grid');
  grid.addEventListener('click', e => {
    const z = e.target.closest('[data-pm]');
    if(z){ openPM(z.dataset.pm); return; }
    const v = e.target.closest('.box[data-size]');
    if(v){ if(v.disabled) return; selectSize(v.dataset.id, Number(v.dataset.size)); return; }
    const a = e.target.closest('[data-add]');
    if(a){
      if(a.disabled) return;
      const card = a.closest('.card'), on = card.querySelector('.box[aria-checked="true"]');
      if(!on){
        const bx = card.querySelector('.boxes'); bx.classList.remove('need'); void bx.offsetWidth; bx.classList.add('need');
        toast('Select a size first'); return;
      }
      addToCart(a.dataset.add, Number(on.dataset.size)); return;
    }
    const c = e.target.closest('[data-copy]');
    if(c) copyPrices(c.dataset.copy);
  });
  grid.addEventListener('keydown', e => {
    const v = e.target.closest('.box[data-size]'); if(!v) return;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const p = findP(v.dataset.id), sizes = buySizes(p);
    if(!sizes.length) return;
    const i = sizes.indexOf(Number(v.dataset.size)) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
    selectSize(p.id, sizes[(i + sizes.length) % sizes.length], true);
  });
  /* broken or missing image -> neutral placeholder, never a broken icon */
  grid.addEventListener('error', e => {
    if(e.target.tagName !== 'IMG') return;
    const pic = e.target.closest('.pic'); if(!pic) return;
    e.target.outerHTML = '<div class="ph"></div>';
  }, true);
}
let searchTimer, lastSearch = '';
function searchEvent(v){
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = clean(v);
    if(q.length >= 2 && q !== lastSearch){ lastSearch = q; px('Search', {search_string: q, content_category: 'perfume'}); }
  }, 1500);
}
function searchList(list, raw){
  const q = norm(raw), words = q.split(' ').filter(Boolean);
  if(!words.length) return list;
  return list.filter(p => {
    const hay = norm(`${p.name} ${p.house} ${p.similar_to || ''} ${catLabel(p.category)} ${sLabel(p.season)}`);
    return words.every(w => hay.includes(w)) || hay.replace(/ /g, '').includes(words.join(''));
  });
}
const hk = p => p.house ? houseKey(p.house) : 'other';
function visibleList(){
  let list = searchList(products, state.q).filter(p => {
    if(state.size !== 'all' && !sizesFor(p).includes(state.size)) return false;
    if(state.cat !== 'all' && p.category !== state.cat) return false;
    if(state.house !== 'all' && hk(p) !== state.house) return false;
    if(state.gender !== 'all' && p.gender !== state.gender) return false;
    if(state.season !== 'all' && !(p.season === state.season || p.season === 'all')) return false;
    return true;
  });
  const ref = p => { const s = state.size !== 'all' ? [state.size] : (buySizes(p).length ? buySizes(p) : sizesFor(p)); return Math.min(...s.map(z => priceOf(p, z))); };
  if(state.sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
  else if(state.sort === 'low') list.sort((a, b) => ref(a) - ref(b));
  else if(state.sort === 'high') list.sort((a, b) => ref(b) - ref(a));
  else list.sort((a, b) => a.no - b.no);    // your list order, 1 to 100 (new ones at the end)
  return list;
}
function cardHTML(p){
  const cols = activeSizes(), avail = sizesFor(p), buy = buySizes(p), out = !buy.length;
  let sel = state.sel[p.id];
  if(state.size !== 'all' && buy.includes(state.size) && !state.touched[p.id]) sel = state.size;
  if(!buy.includes(sel)) sel = null;
  const inCart = !!sel && cart.some(i => i.id === p.id && i.size === sel);
  const thumb = imgUrl(p.thumb_path || p.image_path), full = imgUrl(p.image_path || p.thumb_path);
  const badge = out ? '<span class="outbadge">Stock Out</span>' : '';
  const pic = `<button class="pic zoom" type="button" data-pm="${esc(p.id)}" aria-label="See all sizes and prices of ${esc(p.name)}">${thumb ? `<img src="${esc(thumb)}" alt="${esc(p.name)}" width="400" height="400" loading="lazy" decoding="async">` : '<div class="ph"></div>'}${badge}</button>`;
  const boxes = cols.map(s => {
    if(!avail.includes(s)) return `<span class="box gap" aria-hidden="true"></span>`;
    if(sizeOut(p, s)) return `<button class="box out" type="button" disabled aria-disabled="true" data-id="${esc(p.id)}" data-size="${s}" aria-label="${s}ml, out of stock"><span class="ml">${s}ml</span><span class="pr">Out</span></button>`;
    return `<button class="box" type="button" role="radio" aria-checked="${s === sel}" data-id="${esc(p.id)}" data-size="${s}" aria-label="${s}ml, ${price(priceOf(p, s))}" tabindex="${(sel ? s === sel : s === buy[0]) ? 0 : -1}"><span class="ml">${s}ml</span><span class="pr">${price(priceOf(p, s))}</span></button>`;
  }).join('');
  const cat = catLabel(p.category), tags = [cat, sLabel(p.season)].filter(Boolean);
  return `<article class="card ${out ? 'is-out' : ''}" data-card="${esc(p.id)}" id="p-${esc(p.id)}">
    ${pic}
    <div class="info">
      <div class="head">
        <div>${p.house ? `<div class="no">${esc(p.house)}</div>` : ''}<h2><button class="pname" type="button" data-pm="${esc(p.id)}">${esc(p.name)}</button></h2>${p.similar_to ? `<div class="brand">Similar to ${esc(p.similar_to)}</div>` : ''}${tags.map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</div>
        <button class="copy" type="button" data-copy="${esc(p.id)}" aria-label="Copy prices for ${esc(p.name)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Copy</button>
      </div>
      <div class="boxes" role="radiogroup" aria-label="Choose size for ${esc(p.name)}" style="grid-template-columns:repeat(${Math.max(cols.length, 1)},minmax(0,1fr))">${boxes}</div>
      <button class="add ${inCart ? 'done' : ''}" type="button" data-add="${esc(p.id)}" ${out ? 'disabled' : ''}>${out ? 'Stock Out' : inCart ? 'Added ✓' : sel ? `Add ${sel}ml to cart` : 'Add to cart'}</button>
    </div>
  </article>`;
}
function render(){
  const list = visibleList();
  const filtered = !!clean(state.q) || state.size !== 'all' || state.cat !== 'all' || state.house !== 'all' || state.gender !== 'all' || state.season !== 'all';
  $('clearF').hidden = !filtered;
  $('count').textContent = `${list.length} ${list.length === 1 ? 'perfume' : 'perfumes'}`;
  if(!list.length){
    $('grid').innerHTML = `<div class="empty"><strong>No products found.</strong><p>${clean(state.q) ? 'Try a shorter name or the house name.' : 'Nothing matches these filters right now.'}</p><button type="button" data-clear>Clear Filters</button></div>`;
    $('grid').querySelector('[data-clear]').onclick = clearFilters;
    return;
  }
  $('grid').innerHTML = list.map(cardHTML).join('');
}
function refreshCard(id){
  const el = document.querySelector(`[data-card="${CSS.escape(id)}"]`), p = findP(id);
  if(el && p) el.outerHTML = cardHTML(p);
}
function selectSize(id, size, focus){
  state.sel[id] = size; state.touched[id] = true;
  refreshCard(id);
  if(focus){ const b = document.querySelector(`[data-card="${CSS.escape(id)}"] .box[data-size="${size}"]`); if(b) b.focus(); }
}
async function copyPrices(id){
  const p = findP(id);
  const text = `${p.name}\n` + sizesFor(p).map(s => `${s}ml — ${sizeOut(p, s) ? 'Stock out' : price(priceOf(p, s))}`).join('\n');
  toast(await copyText(text) ? 'Prices copied ✓' : 'Copy failed. Press and hold to copy.');
}

/* ---------- product popup: big photo + every size and price ---------- */
let pmId = null, pmReturn = null;
function pmHTML(p){
  const sizes = sizesFor(p);
  return sizes.map(s => {
    const out = sizeOut(p, s), inCart = cart.find(i => i.id === p.id && i.size === s);
    return `<div class="pmc ${out ? 'out' : ''}"><span class="ml">${s} ml</span><b>${out ? '—' : price(priceOf(p, s))}</b><small>${out ? 'Stock Out' : 'tk'}</small>
      <button type="button" class="pmadd ${inCart ? 'in' : ''}" data-pmadd="${s}" ${out ? 'disabled' : ''} aria-label="Add ${s}ml of ${esc(p.name)} to cart">${out ? 'Out' : inCart ? `Added${inCart.qty > 1 ? ' ×' + inCart.qty : ''}` : 'Add'}</button></div>`;
  }).join('');
}
function openPM(id){
  const p = findP(id); if(!p) return;
  pmId = id; pmReturn = document.activeElement;
  const full = imgUrl(p.image_path || p.thumb_path);
  $('pmImg').innerHTML = full ? `<img src="${esc(full)}" alt="${esc(p.name)}">` : '<div class="ph"></div>';
  $('pmHouse').textContent = p.house || '';
  $('pmName').textContent = p.name;
  $('pmSim').textContent = p.similar_to ? 'Similar to ' + p.similar_to : '';
  $('pmTags').innerHTML = [catLabel(p.category), sLabel(p.season)].filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join(' ');
  $('pmGrid').style.gridTemplateColumns = `repeat(${Math.max(1, sizesFor(p).length)},minmax(0,1fr))`;
  $('pmGrid').innerHTML = pmHTML(p);
  $('pmLink').hidden = !p.fragrantica_url; if(p.fragrantica_url) $('pmLink').href = p.fragrantica_url;
  $('pm').hidden = false; document.body.classList.add('lock');
  setTimeout(() => $('pmClose').focus(), 30);
  viewContent(p);
}
function closePM(){
  if($('pm').hidden) return;
  $('pm').hidden = true; document.body.classList.remove('lock'); pmId = null;
  if(pmReturn && pmReturn.focus) pmReturn.focus();
}
if($('pm')){
  $('pmClose').onclick = closePM;
  $('pm').addEventListener('click', e => {
    if(e.target === $('pm')) return closePM();
    const b = e.target.closest('[data-pmadd]'); if(!b || b.disabled || !pmId) return;
    addToCart(pmId, Number(b.dataset.pmadd));
    const p = findP(pmId); if(p) $('pmGrid').innerHTML = pmHTML(p);
  });
}

/* ---------- photo viewer ---------- */
function openPhoto(src, alt){ $('lbImg').src = src; $('lbImg').alt = alt || ''; $('lb').classList.add('show'); }
function closePhoto(){ $('lb').classList.remove('show'); $('lbImg').removeAttribute('src'); }
$('lb').addEventListener('click', closePhoto);

/* ---------- copy helper ---------- */
async function copyText(t){
  try { await navigator.clipboard.writeText(t); return true; }
  catch(e){
    const ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
    let ok = false; try { ok = document.execCommand('copy'); } catch(_){}
    ta.remove(); return ok;
  }
}

/* ================= CART (one line per perfume + size, with quantity 1 to 10) ================= */
const MAXQ = 10;
let cart = [];                                       // [{id, type:'perfume', size, qty}]
function loadCart(){
  let raw = ls.get('khayr_cart', []);
  if(!Array.isArray(raw)) raw = [];
  const oldAttar = ls.get('khayr_attar_cart', null);
  ls.del('khayr_attar_cart');
  const out = []; let dropped = 0, attar = (Array.isArray(oldAttar) ? oldAttar.length : 0);
  raw.forEach(i => {
    if(!i || !i.id) return;
    if(i.type === 'attar' || String(i.id).startsWith('attar-')){ attar++; return; }
    const p = findP(i.id), size = Number(i.size);
    if(!p || !sizesFor(p).includes(size)){ dropped++; return; }          // a stock-out size stays, so the customer can change it
    const q = Math.max(1, Math.min(MAXQ, Math.round(Number(i.qty) || 1)));
    const same = out.find(x => x.id === p.id && x.size === size);
    if(same){ same.qty = Math.min(MAXQ, same.qty + q); return; }
    out.push({id: p.id, type: 'perfume', size, qty: q});
  });
  cart = out;
  if(attar) setTimeout(() => toast('Attar is no longer sold on the website, so it was removed from your cart.'), 300);
  else if(dropped) setTimeout(() => toast('Some items in your cart are no longer available and were removed.'), 300);
}
const lineOk = i => canBuy(findP(i.id), i.size);
const subtotal = () => cart.reduce((t, i) => t + priceOf(findP(i.id), i.size) * i.qty, 0);
const itemCount = () => cart.reduce((t, i) => t + i.qty, 0);
function amounts(){
  const sub = subtotal(), full = saved.pay === 'full';
  const disc = full ? fullDiscount(sub) : 0;                    // the discount is on the perfumes only, never on delivery
  const fee = deliveryFee(details().area, sub);
  return {sub, disc, fee, total: sub - disc + (fee || 0), full};
}
function updateCartUI(){
  ls.set('khayr_cart', cart);
  const n = itemCount();
  $('cartLabel').textContent = `Cart (${n})`;
  document.body.classList.toggle('has-bar', n > 0);
  $('barText').innerHTML = `Cart <span class="dot">•</span> ${n} item${n === 1 ? '' : 's'} <span class="dot">•</span> ${price(subtotal())}`;
}
function addToCart(id, size){
  const p = findP(id);
  if(!canBuy(p, size)){ toast('This size is out of stock.'); return; }
  const have = cart.find(i => i.id === id && i.size === size);
  if(have){
    if(have.qty >= MAXQ){ toast(`You can order up to ${MAXQ} of one size.`); return; }
    have.qty++;
  } else cart.push({id, type: 'perfume', size, qty: 1});
  updateCartUI(); refreshCard(id);
  toast(have ? `Added ✓ ${p.name}, ${size}ml × ${have.qty}` : `Added ✓ ${p.name}, ${size}ml`);
  px('AddToCart', {content_ids: [p.id], content_type: 'product', content_name: p.name, content_category: p.house || 'perfume', contents: [pxItem(p, size)], value: priceOf(p, size), currency: 'BDT'});
  if(document.body.classList.contains('open')) renderDrawer();
}
function removeFromCart(idx){
  const [gone] = cart.splice(idx, 1);
  updateCartUI(); if(PAGE === 'perfume') refreshCard(gone.id);
  renderDrawer();
}
function changeSize(idx, size){
  const it = cart[idx], p = findP(it.id);
  if(!p || it.size === size) return;
  if(!canBuy(p, size)){ toast(`${size}ml is out of stock.`); return; }
  const other = cart.findIndex((x, k) => k !== idx && x.id === it.id && x.size === size);
  if(other > -1){                                    // that size is already in the cart: put them together
    cart[other].qty = Math.min(MAXQ, cart[other].qty + it.qty); cart.splice(idx, 1);
    toast(`${p.name} ${size}ml: quantity ${cart[other > idx ? other - 1 : other].qty}`);
  } else it.size = size;
  notice = null;
  updateCartUI(); if(PAGE === 'perfume') refreshCard(it.id);
  renderDrawer();
}

function changeQty(idx, d){
  const it = cart[idx]; if(!it) return;
  const q = it.qty + d;
  if(q < 1){ removeFromCart(idx); return; }
  if(q > MAXQ){ toast(`You can order up to ${MAXQ} of one size.`); return; }
  it.qty = q; notice = null;
  updateCartUI(); renderDrawer();
}

/* ---------- customer details (saved on this phone only) ---------- */
const saved = ls.get('khayr_customer', {}) || {};
const normPhone = v => { let d = String(v || '').replace(/\D/g, ''); if(d.startsWith('880')) d = d.slice(2); if(d.length === 10 && d[0] === '1') d = '0' + d; return d; };
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function details(){
  return {name: clean(saved.name), phone: normPhone(saved.phone), email: clean(saved.email), address: clean(saved.address),
          area: saved.area === 'Inside Sylhet' || saved.area === 'Outside Sylhet' ? saved.area : ''};
}
function problems(d){
  const e = {};
  if(!d.name) e.name = 'Please enter your name.';
  else if(d.name.length > 80) e.name = 'Please enter a shorter name.';
  if(!clean(saved.phone)) e.phone = 'Please enter your phone number.';
  else if(!/^01[3-9]\d{8}$/.test(d.phone)) e.phone = 'Please enter a valid phone number, like 01XXXXXXXXX.';
  if(!d.address) e.address = 'Please enter your delivery address.';
  else if(d.address.length > 250) e.address = 'Please shorten the address.';
  if(d.email && !validEmail(d.email)) e.email = 'Please enter a valid email address, or leave it empty.';
  if(!d.area) e.area = 'Please choose Inside Sylhet or Outside Sylhet.';
  return e;
}
let errs = {};

/* ---------- the order ---------- */
/* One checkout = one clientRef. Copy and WhatsApp for the same cart + details + payment give the SAME Order ID. */
let draft = ls.get('khayr_order_v5', null);          // {sig, ref, at, orderId, methods, offline, lead, amounts}
let lastAction = null;                               // {method, orderId, sig}
let notice = null;                                   // {kind:'warn'|'ok', title, text}
let busy = false;
function sigNow(){
  const d = details();
  return JSON.stringify([cart.map(i => i.id + ':' + i.size + 'x' + i.qty), d.name, d.phone, d.email, d.address, d.area, saved.pay === 'full' ? 'full' : 'advance']);
}
function currentDraft(){
  const sig = sigNow();
  if(!draft || draft.sig !== sig || Date.now() - (draft.at || 0) > 6 * 36e5){
    draft = {sig, ref: newId(), at: Date.now(), orderId: null, methods: [], offline: false, lead: false, amounts: null};
    saveDraft();
  }
  return draft;
}
const saveDraft = () => ls.set('khayr_order_v5', draft);
function orderText(orderId){
  const d = details(), a = (draft && draft.amounts) || amounts();
  const lines = cart.map(i => { const p = findP(i.id), u = priceOf(p, i.size); return `${p.name}\n${i.size}ml${i.qty > 1 ? ` × ${i.qty}` : ''} — ${price(u * i.qty)}`; });
  const fee = a.fee === undefined ? deliveryFee(d.area, a.sub) : a.fee;
  const pay = [`Subtotal: ${price(a.sub)}`,
    a.full ? `Discount (${pct()}% full payment): -${price(a.disc)}` : null,
    `Delivery (${d.area}): ${fee ? price(fee) : 'Free'}`,
    `Total: ${price(a.total)}`,
    a.full ? `Payment: Full payment by bKash` : null].filter(Boolean);
  return [
    SHOP + ' ORDER', '',
    orderId ? `Order ID: ${orderId}` : null, orderId ? '' : null,
    `Name: ${d.name}`,
    `Phone: ${d.phone}`,
    d.email ? `Email: ${d.email}` : null,
    `Address: ${d.address}`,
    `Delivery Area: ${d.area}`, '',
    lines.join('\n\n'), '',
    ...pay
  ].filter(l => l !== null).join('\n');
}
function pxContents(value){
  return {content_ids: cart.map(i => i.id), contents: cart.map(i => pxItem(findP(i.id), i.size, i.qty)), content_type: 'product', num_items: itemCount(),
          value: value ?? subtotal(), currency: 'BDT'};
}
async function refreshData(){
  try { applyData(await fetchData()); if(PAGE === 'perfume' && HR){ HR = houseRanks(); render(); } } catch(e){}
}

/* Save the order on the server. Returns {ok:true, orderId} or {ok:false} (the message is already shown). */
async function submit(method, retried){
  const dr = currentDraft();
  const body = {
    action: 'create_order', clientRef: dr.ref, method, paymentChoice: saved.pay === 'full' ? 'full' : 'advance',
    customer: details(), items: cart.map(i => ({id: i.id, type: 'perfume', size: i.size, qty: i.qty})), expectedTotal: subtotal(),
    marketingOk: !adsOff(), attribution: ATTR, fbp: cookie('_fbp'), fbc: fbcValue(), pageUrl: location.href
  };
  let r, j = null;
  try{
    if(!API || !sbReady()) throw new Error('not set up');
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
    r = await fetch(API, {method: 'POST', headers: {'Content-Type': 'application/json', apikey: SB.anonKey}, body: JSON.stringify(body), signal: ctl.signal});
    clearTimeout(timer);
    j = await r.json().catch(() => null);
  }catch(e){ return failed(dr); }
  if(r.ok && j && j.ok && j.orderId){
    dr.orderId = j.orderId;
    if(Number.isInteger(j.total)) dr.amounts = {sub: j.subtotal ?? j.total, disc: j.discount || 0, fee: j.deliveryFee || 0, total: j.total, full: j.paymentChoice === 'full'};
    if(!dr.methods.includes(method)) dr.methods.push(method);
    if(!dr.lead){
      dr.lead = true;
      const value = Number(j.total) || subtotal();
      px('Lead', pxContents(value), j.leadEventId || ('lead-' + j.orderId));
      if(j.purchaseEventId) px('Purchase', {...pxContents(value), order_id: j.orderId}, j.purchaseEventId);   // same event id as the server: counted once
    }
    saveDraft(); notice = null;
    return {ok: true, orderId: j.orderId};
  }
  if(r.status === 409 && j){
    if(j.code === 'ref_mismatch' && !retried){ dr.ref = newId(); dr.orderId = null; dr.methods = []; dr.lead = false; saveDraft(); return submit(method, true); }
    await refreshData();
    if(j.code === 'unavailable'){
      const gone = [], out = [];
      (j.problems || []).forEach(x => {
        const k = cart.findIndex(i => i.id === x.id && String(i.size) === String(x.size));
        if(k < 0) return;
        const label = `${x.name || (findP(x.id) || {}).name || 'An item'} ${x.size}ml`;
        if(x.reason === 'stock_out' && findP(x.id)) out.push(label);
        else { gone.push(label); cart.splice(k, 1); }
      });
      notice = {kind: 'warn', title: out.length && !gone.length ? 'Out of stock' : 'Some items are no longer available',
                text: (gone.length ? gone.join(', ') + ' removed from your cart. ' : '') + (out.length ? out.join(', ') + ' just went out of stock. Choose another size or remove it. ' : '') + 'Then tap again.'};
    } else {
      notice = {kind: 'warn', title: 'Some prices were updated', text: `Please check the new total (${price(subtotal())}) and tap again to order.`};
    }
    updateCartUI(); renderDrawer();
    return {ok: false};
  }
  if(r.status === 400 && j && j.field){
    errs = {[j.field]: j.error}; renderDrawer(); focusFirstError(); return {ok: false};
  }
  if((r.status === 429 || r.status === 400) && j && j.error){
    notice = {kind: 'warn', title: 'Order not sent yet', text: j.error}; renderDrawer(); return {ok: false};
  }
  return failed(dr);
}
function failed(dr){
  if(dr.orderId) return {ok: true, orderId: dr.orderId, unsaved: true};      // order already saved earlier; just could not add this button
  dr.offline = true; saveDraft();
  notice = {kind: 'warn', title: 'We could not save your order online', text: 'Please check your internet and tap again. If it still does not work, tapping again will send your order to us without an Order ID, and we will still receive it.'};
  renderDrawer();
  return {ok: false};
}
function readyOrder(){
  if(!cart.length){ toast('Your cart is empty.'); return false; }
  const bad = cart.filter(i => !lineOk(i));
  if(bad.length){
    notice = {kind: 'warn', title: 'Out of stock', text: bad.map(i => `${findP(i.id).name} ${i.size}ml`).join(', ') + ' is out of stock. Choose another size or remove it.'};
    renderDrawer(); const el = document.querySelector('.line.bad'); if(el) el.scrollIntoView({block: 'center', behavior: 'smooth'});
    return false;
  }
  errs = problems(details());
  if(Object.keys(errs).length){ renderDrawer(); focusFirstError(); return false; }
  currentDraft();
  return true;
}
function focusFirstError(){
  const firstId = {name:'cName', phone:'cPhone', address:'cAddr', email:'cEmail', area:'areas'}[Object.keys(errs)[0]];
  const el = $(firstId);
  if(el){ el.scrollIntoView({block: 'center', behavior: 'smooth'}); if(firstId !== 'areas') el.focus({preventScroll: true}); }
}
function setBusy(on, which){
  busy = on;
  ['waBtn', 'cpBtn'].forEach(id => { const b = $(id); if(!b) return; b.disabled = on; b.classList.toggle('wait', on && id === which); });
  const b = which && $(which); if(b && on) b.querySelector('span').textContent = 'Saving your order…';
}
const isMobile = () => /Android|iPhone|iPad|iPod|Mobile|Silk|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
const waUrl = text => 'https://wa.me/' + String(GEN.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(text);
function done(method, orderId){
  lastAction = {method, orderId: orderId || null, sig: draft.sig};
  ss.set('khayr_last', lastAction);
  notice = null;
  px(method === 'WhatsApp' ? 'WhatsAppOrder' : 'CopyOrder', {...pxContents(draft.amounts ? draft.amounts.total : amounts().total), order_id: orderId || ''}, null, true);
  renderDrawer();
}

async function orderOnWhatsApp(){
  if(busy || !readyOrder()) return;
  const dr = draft;
  if(dr.offline && !dr.orderId){                       // second tap after a failure: send without an ID
    const url = waUrl(orderText(null));
    dr.offline = false; saveDraft();
    done('WhatsApp', null);
    const w = isMobile() ? null : window.open(url, '_blank');   // no 'noopener' here: it makes open() return null and WhatsApp would open twice
    if(w){ try { w.opener = null; } catch(e){} } else location.href = url;
    return;
  }
  // Desktop: open the tab now (inside the tap) so the browser does not block it; fill it in after saving.
  let win = null;
  if(!isMobile()){
    win = window.open('', '_blank');
    if(win){ try { win.opener = null; win.document.title = 'Opening WhatsApp…'; win.document.body.innerHTML = '<p style="font:16px/1.5 sans-serif;padding:24px">Opening WhatsApp…</p>'; } catch(e){} }
  }
  setBusy(true, 'waBtn');
  const res = await submit('WhatsApp');
  setBusy(false, 'waBtn');
  if(!res.ok){ if(win) try { win.close(); } catch(e){} renderDrawer(); return; }
  const url = waUrl(orderText(res.orderId));
  done('WhatsApp', res.orderId);
  if(win && !win.closed) win.location.href = url;
  else location.href = url;
}

async function copyFullOrder(){
  if(busy || !readyOrder()) return;
  const dr = draft;
  if(dr.offline && !dr.orderId){
    if(await copyText(orderText(null))){ dr.offline = false; saveDraft(); done('Copy Order', null); toast('Order copied ✓'); }
    else toast('Copy failed. Use Order on WhatsApp instead.');
    return;
  }
  if(dr.orderId && dr.methods.includes('Copy Order')){             // already saved: copy straight away
    if(await copyText(orderText(dr.orderId))){ done('Copy Order', dr.orderId); toast('Order copied ✓'); }
    else toast('Copy failed. Use Order on WhatsApp instead.');
    return;
  }
  setBusy(true, 'cpBtn');
  const job = submit('Copy Order');
  let copied = false;
  // Safari and Chrome allow the copy to wait for the server if it starts inside the tap
  if(window.ClipboardItem && navigator.clipboard && navigator.clipboard.write){
    const blob = job.then(r => { if(!r.ok) throw new Error('stop'); return new Blob([orderText(r.orderId)], {type: 'text/plain'}); });
    try { await navigator.clipboard.write([new ClipboardItem({'text/plain': blob})]); copied = true; } catch(e){}
  }
  const res = await job;
  setBusy(false, 'cpBtn');
  if(!res.ok){ renderDrawer(); return; }
  if(!copied) copied = await copyText(orderText(res.orderId));
  if(copied){ done('Copy Order', res.orderId); toast('Order copied ✓'); }
  else {
    notice = {kind: 'ok', title: `Order saved ✓  Order ID: ${res.orderId}`, text: 'Tap Copy Full Order again to copy it, then paste it into WhatsApp, Messenger or SMS.'};
    renderDrawer();
  }
}

/* ---------- drawer ---------- */
function openCart(){
  closeMenu();
  document.body.classList.add('open'); $('drawer').setAttribute('aria-hidden', 'false');
  notice = null; renderDrawer();
  if(cart.length){
    const sig = cart.map(i => i.id + ':' + i.size + 'x' + i.qty).join('|');
    if(ss.get('khayr_ic', '') !== sig){ ss.set('khayr_ic', sig); px('InitiateCheckout', pxContents()); }
  }
  setTimeout(() => $('closeCart').focus(), 60);
}
function closeCart(){ document.body.classList.remove('open'); $('drawer').setAttribute('aria-hidden', 'true'); $('cartBtn').focus(); }
$('cartBtn').onclick = openCart; $('bar').onclick = openCart;
$('closeCart').onclick = closeCart; $('scrim').onclick = closeCart;
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  if($('pm') && !$('pm').hidden) closePM();
  else if($('lb').classList.contains('show')) closePhoto();
  else if($('qrv') && $('qrv').classList.contains('show')) closeQr();
  else if(document.body.classList.contains('open')) closeCart();
  else if(document.body.classList.contains('menu')) closeMenu();
});
function restoreLastAction(){
  const la = ss.get('khayr_last', null);
  if(la && cart.length && la.sig === sigNow()) lastAction = la;
}

const WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z"/></svg>';
const COPY_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const BUILTIN_QR = {label: 'bKash (Personal)', details: '01740235029', src: 'bkash-qr.jpg?v=6.1'};   // shown when no QR is set in Admin > Payment
const activeQrs = () => { const l = ((GEN.payment || {}).qrs || []).filter(q => q && q.active !== false && (q.image_path || q.thumb_path)); return l.length ? l : [BUILTIN_QR]; };
const qrSrc = (q, big) => q.src || imgUrl(big ? (q.image_path || q.thumb_path) : (q.thumb_path || q.image_path));
function lineHTML(i, k){
  const p = findP(i.id), ok = lineOk(i), sizes = sizesFor(p), th = imgUrl(p.thumb_path || p.image_path);
  const opts = sizes.map(z => {
    const out = sizeOut(p, z);
    return `<option value="${z}" ${z === i.size ? 'selected' : ''} ${out && z !== i.size ? 'disabled' : ''}>${z} ml – ${out ? 'Stock Out' : price(priceOf(p, z)) + ' tk'}</option>`;
  }).join('');
  return `<div class="line ${ok ? '' : 'bad'}">
    <div class="lthumb">${th ? `<img src="${esc(th)}" alt="" width="56" height="56" loading="lazy">` : ''}</div>
    <div class="lmain">
      <div class="lrow"><div class="n">${esc(p.name)}</div>
        <div class="qty" role="group" aria-label="Quantity of ${esc(p.name)} ${i.size}ml">
          <button type="button" data-q="-1" data-li="${k}" aria-label="One less">−</button><span aria-live="polite">${i.qty}</span><button type="button" data-q="1" data-li="${k}" aria-label="One more" ${i.qty >= MAXQ ? 'disabled' : ''}>+</button>
        </div></div>
      <div class="lrow2">${p.house ? `<div class="m">${esc(p.house)}</div>` : '<div></div>'}<div class="lp">${price(priceOf(p, i.size) * i.qty)} tk</div></div>
      <label class="lsel"><span class="sr">Size of ${esc(p.name)}</span><select data-lsel="${k}">${opts}</select></label>
      ${ok ? '' : `<div class="lwarn">${i.size}ml is out of stock. Choose another size or remove it.</div>`}
      <button type="button" class="rm" data-rm="${k}" aria-label="Remove ${esc(p.name)} ${i.size}ml">Remove</button>
    </div>
  </div>`;
}
function payHTML(){
  const a = amounts(), full = a.full, dfull = fullDiscount(a.sub), area = details().area;
  const qrs = activeQrs(), free = freeOver(), need = free > 0 ? free - a.sub : 0;
  return `<div class="pay" id="pay">
    <h4>Payment</h4>
    ${pct() ? `<button type="button" class="payopt one" role="checkbox" data-pay="${full ? 'advance' : 'full'}" aria-checked="${full}">
        <i class="tick" aria-hidden="true"></i><span><b>Pay the full amount now by bKash</b><span>Get ${pct()}% off the perfumes${dfull ? ` · save ${price(dfull)} tk` : ''}</span></span></button>` : ''}
    <div class="sums">
      <div><span>Subtotal (${itemCount()} item${itemCount() === 1 ? '' : 's'})</span><span>${price(a.sub)}</span></div>
      ${full && a.disc ? `<div class="dis"><span>Discount (${pct()}%)</span><span>-${price(a.disc)}</span></div>` : ''}
      <div><span>Delivery${area ? ` (${esc(area)})` : ''}</span><span>${a.fee === null ? 'Choose area' : a.fee ? price(a.fee) : 'Free'}</span></div>
      <div class="total"><span>${full ? 'Total to pay' : 'Total'}</span><span>${price(a.total)}</span></div>
      ${need > 0 ? `<p class="freehint">Add ${price(need)} tk more for <b>free delivery</b> all over Bangladesh.</p>` : free > 0 ? `<p class="freehint ok">You get <b>free delivery</b> ✓</p>` : ''}
    </div>
    ${qrs.length ? `<div class="qrs"><div class="qrt">Pay by bKash</div>${qrs.map((q, k) => `<div class="qr">
        <button type="button" class="qrimg" data-qr="${k}" aria-label="Open ${esc(q.label || 'QR code')}"><img src="${esc(qrSrc(q))}" alt="${esc(q.label || 'Payment QR code')}" width="400" height="400" loading="lazy"></button>
        <div class="qrinfo"><b>${esc(q.label || 'Payment')}</b>${q.details ? `<span class="qrnum">${esc(q.details)}</span>` : ''}<button type="button" class="qrbtn" data-qr="${k}">View QR</button></div>
      </div>`).join('')}
      <p class="note">${full ? `Pay ${price(a.total)} tk` : 'Pay by bKash'}, then send the payment screenshot or TrxID to us on WhatsApp.</p></div>` : ''}
  </div>`;
}
function renderDrawer(){
  const body = $('dbody'), foot = $('dfoot'), keep = body.scrollTop;
  $('cartTitle').textContent = cart.length ? `Your order (${itemCount()})` : 'Your order';
  if(!cart.length){
    body.innerHTML = `<div class="cart-empty"><p><strong>Your cart is empty.</strong></p><p>Select a size on any perfume, then tap Add to cart.</p>
      <div class="row"><a href="./">Browse perfumes</a></div></div>`;
    foot.innerHTML = '';
    if(notice) body.insertAdjacentHTML('afterbegin', `<div class="warn-msg" role="alert"><b>${esc(notice.title)}</b>${esc(notice.text)}</div>`);
    return;
  }
  const d = details();
  const sameOrder = lastAction && lastAction.sig === sigNow();
  body.innerHTML = cart.map(lineHTML).join('') + `
    <div class="form" id="form">
      <h4>Your details</h4>
      <div class="field ${errs.name ? 'bad' : ''}"><span><label for="cName">Name</label></span><input id="cName" autocomplete="name" autocapitalize="words" enterkeyhint="next" maxlength="80" value="${esc(saved.name || '')}" aria-describedby="eName" aria-invalid="${!!errs.name}"><div class="err" id="eName">${esc(errs.name || '')}</div></div>
      <div class="field ${errs.phone ? 'bad' : ''}"><span><label for="cPhone">Phone Number</label></span><input id="cPhone" type="tel" inputmode="tel" autocomplete="tel" enterkeyhint="next" placeholder="01XXXXXXXXX" maxlength="20" value="${esc(saved.phone || '')}" aria-describedby="ePhone" aria-invalid="${!!errs.phone}"><div class="err" id="ePhone">${esc(errs.phone || '')}</div></div>
      <div class="field ${errs.address ? 'bad' : ''}"><span><label for="cAddr">Address</label></span><textarea id="cAddr" autocomplete="street-address" rows="2" maxlength="250" placeholder="House, road, area, city" aria-describedby="eAddr" aria-invalid="${!!errs.address}">${esc(saved.address || '')}</textarea><div class="err" id="eAddr">${esc(errs.address || '')}</div></div>
      <div class="field ${errs.email ? 'bad' : ''}"><span><label for="cEmail">Email <em>(optional)</em></label></span><input id="cEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="none" enterkeyhint="done" maxlength="100" value="${esc(saved.email || '')}" aria-describedby="eEmail" aria-invalid="${!!errs.email}"><div class="err" id="eEmail">${esc(errs.email || '')}</div></div>
      <span id="areaLbl" style="display:block;font-size:.9rem;font-weight:500;margin-bottom:6px">Delivery Area</span>
      <div class="areas ${errs.area ? 'bad' : ''}" id="areas" role="radiogroup" aria-labelledby="areaLbl">
        <button type="button" class="area" role="radio" data-area="Inside Sylhet" aria-checked="${d.area === 'Inside Sylhet'}">Inside Sylhet</button>
        <button type="button" class="area" role="radio" data-area="Outside Sylhet" aria-checked="${d.area === 'Outside Sylhet'}">Outside Sylhet</button>
      </div>
      <div class="err" id="eArea" style="${errs.area ? 'display:block' : ''}">${esc(errs.area || '')}</div>
    </div>
    ${payHTML()}
    ${notice ? `<div class="${notice.kind === 'ok' ? 'done-msg' : 'warn-msg'}" role="alert"><b>${esc(notice.title)}</b>${esc(notice.text)}</div>` : ''}
    ${sameOrder ? `<div class="done-msg" role="status"><b>${lastAction.method === 'WhatsApp' ? 'WhatsApp opened with your order ✓' : 'Order copied ✓'}</b>${lastAction.orderId ? `Order ID: ${esc(lastAction.orderId)}. ` : ''}${lastAction.method === 'WhatsApp' ? 'Press send in WhatsApp to finish.' : 'Paste it into WhatsApp, Messenger or SMS and send it to us.'}</div>
      <button class="btn-link" id="newOrder" type="button">Start a new order</button>` : ''}
    ${GEN.orderNote ? `<p class="note">${esc(GEN.orderNote)}</p>` : ''}`;
  foot.innerHTML = `
    <button class="btn-dark" id="waBtn" type="button">${WA_ICON}<span>Order on WhatsApp</span></button>
    <button class="btn-line" id="cpBtn" type="button">${COPY_ICON}<span>Copy Full Order</span></button>`;
  $('waBtn').onclick = orderOnWhatsApp; $('cpBtn').onclick = copyFullOrder;
  if(busy) setBusy(true, null);
  body.scrollTop = keep;
}
$('dbody').addEventListener('input', e => {
  const map = {cName:'name', cPhone:'phone', cAddr:'address', cEmail:'email'};
  const k = map[e.target.id]; if(!k) return;
  saved[k] = e.target.value; ls.set('khayr_customer', saved);
  delete errs[k];
  const f = e.target.closest('.field'); if(f) f.classList.remove('bad');
});
$('dbody').addEventListener('click', e => {
  const t = e.target.closest('button'); if(!t) return;
  if(t.dataset.rm !== undefined){ notice = null; removeFromCart(+t.dataset.rm); }
  else if(t.dataset.q){ changeQty(+t.dataset.li, Number(t.dataset.q)); }
  else if(t.dataset.area){ saved.area = t.dataset.area; ls.set('khayr_customer', saved); delete errs.area; renderDrawer(); }
  else if(t.dataset.pay){ saved.pay = t.dataset.pay; ls.set('khayr_customer', saved); renderDrawer(); }
  else if(t.dataset.qr !== undefined){ openQr(+t.dataset.qr); }
  else if(t.id === 'newOrder'){
    cart = []; draft = null; lastAction = null; notice = null; ls.del('khayr_order_v5'); ss.del('khayr_last');
    updateCartUI(); if(PAGE === 'perfume') render(); closeCart(); toast('Cart cleared');
  }
});

$('dbody').addEventListener('change', e => {
  if(e.target.dataset.lsel !== undefined) changeSize(+e.target.dataset.lsel, Number(e.target.value));
});

/* ---------- QR viewer (big, easy to scan or save) ---------- */
function openQr(k){
  const q = activeQrs()[k]; if(!q) return;
  const full = qrSrc(q, true);
  $('qrvImg').src = full; $('qrvImg').alt = q.label || 'Payment QR code';
  $('qrvLabel').textContent = q.label || 'Payment';
  $('qrvDetails').textContent = q.details || '';
  $('qrvOpen').href = full;
  $('qrv').classList.add('show');
  setTimeout(() => $('qrvClose').focus(), 30);
}
function closeQr(){ $('qrv').classList.remove('show'); $('qrvImg').removeAttribute('src'); }
if($('qrv')){ $('qrvClose').onclick = closeQr; $('qrv').addEventListener('click', e => { if(e.target === $('qrv')) closeQr(); }); }

/* ================= BOTTLE PHOTOS ================= */
let gList = [], gAt = 0, gReturn = null;
async function initBottles(){
  gList = await fetchGallery();
  $('gallery').innerHTML = gList.length
    ? gList.map((x, i) => `<button type="button" class="gitem" data-gi="${i}" aria-label="Open photo${x.caption ? ': ' + esc(x.caption) : ''}"><span class="ph2"><img src="${esc(imgUrl(x.thumb_path || x.image_path))}" alt="${esc(x.caption || 'Decant bottle')}" loading="lazy" width="400" height="400"></span>${x.caption ? `<span class="cap">${esc(x.caption)}</span>` : ''}</button>`).join('')
    : `<div class="empty"><strong>Photos coming soon.</strong><p>Decant bottle photos will appear here.</p><a class="btn" href="./">Explore Perfume Decants</a></div>`;
  $('gallery').addEventListener('click', e => { const b = e.target.closest('[data-gi]'); if(b) openG(+b.dataset.gi); });
  $('glbClose').onclick = closeG;
  $('glbPrev').onclick = () => openG(gAt - 1);
  $('glbNext').onclick = () => openG(gAt + 1);
  $('glb').addEventListener('click', e => { if(e.target === $('glb')) closeG(); });
  let sx = null;
  $('glb').addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, {passive: true});
  $('glb').addEventListener('touchend', e => { if(sx === null) return; const dx = e.changedTouches[0].clientX - sx; sx = null; if(Math.abs(dx) > 45) openG(gAt + (dx < 0 ? 1 : -1)); });
  document.addEventListener('keydown', e => {
    if(!$('glb').classList.contains('show')) return;
    if(e.key === 'Escape') closeG(); else if(e.key === 'ArrowRight') openG(gAt + 1); else if(e.key === 'ArrowLeft') openG(gAt - 1);
  });
}
function openG(i){
  if(!gList.length) return;
  gAt = (i + gList.length) % gList.length;
  const x = gList[gAt];
  if(!$('glb').classList.contains('show')) gReturn = document.activeElement;
  $('glbImg').src = imgUrl(x.image_path || x.thumb_path); $('glbImg').alt = x.caption || 'Bottle photo';
  $('glbCap').textContent = x.caption || '';
  $('glbCount').textContent = `${gAt + 1} / ${gList.length}`;
  $('glbPrev').hidden = $('glbNext').hidden = gList.length < 2;
  $('glb').classList.add('show'); document.body.classList.add('lock');
  $('glbClose').focus();
}
function closeG(){ $('glb').classList.remove('show'); document.body.classList.remove('lock'); $('glbImg').removeAttribute('src'); if(gReturn) gReturn.focus(); }

/* ---------- header: menu + search button ---------- */
function openMenu(){ document.body.classList.add('menu'); $('mnav').setAttribute('aria-hidden', 'false'); setTimeout(() => $('closeMenu').focus(), 30); }
function closeMenu(){ if(!document.body.classList.contains('menu')) return; document.body.classList.remove('menu'); $('mnav').setAttribute('aria-hidden', 'true'); }
if($('menuBtn')){ $('menuBtn').onclick = openMenu; $('closeMenu').onclick = () => { closeMenu(); $('menuBtn').focus(); }; }
if($('findBtn')) $('findBtn').onclick = () => {
  const q = $('q');
  if(!q){ location.href = './#search'; return; }
  (q.closest('.search') || q).scrollIntoView({behavior: 'smooth', block: 'center'});
  setTimeout(() => q.focus({preventScroll: true}), 350);
};
if(PAGE === 'perfume' && location.hash === '#search') setTimeout(() => { const q = $('q'); if(q) q.focus(); }, 400);
document.querySelectorAll('[data-wa]').forEach(a => a.addEventListener('click', () => px('Contact', {content_category: 'whatsapp'})));

/* ---------- Privacy page: ads tracking switch ---------- */
const adsBtn = $('adsToggle');
if(adsBtn){
  const paint = () => { $('adsState').textContent = adsOff() ? 'Off on this device' : 'On'; adsBtn.textContent = adsOff() ? 'Turn ads measurement back on' : 'Turn off ads measurement on this device'; };
  paint();
  adsBtn.onclick = () => { try { adsOff() ? localStorage.removeItem('khayr_ads_off') : localStorage.setItem('khayr_ads_off', '1'); } catch(e){} paint(); toast('Saved ✓ It applies the next time a page opens.'); };
}

/* ---------- toast + back to top ---------- */
let tt;
function toast(t){ const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 2600); }
let tick = false;
window.addEventListener('scroll', () => {
  if(tick) return; tick = true;
  requestAnimationFrame(() => { $('toTop').classList.toggle('show', window.scrollY > 1100); tick = false; });
}, {passive: true});
$('toTop').onclick = () => window.scrollTo({top: 0, behavior: 'smooth'});

load();
})();
