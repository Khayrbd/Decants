/* ============================================================
   KHAYR shop script, shared by every customer page.
   Pages tell it who they are with <body data-page="home|perfume|attar|privacy">.
   Nothing secret lives here: prices are checked again on the server.
   ============================================================ */
(function(){
'use strict';
const CFG = window.SHOP_CONFIG || {};
const SITE = window.SITE_CONFIG || {};
const SB = CFG.supabase || {};
const SHOP = CFG.shopName || 'KHAYR';
const PAGE = document.body.dataset.page || 'home';
const BUCKET = SB.imageBucket || 'perfume-images';
const SB_URL = String(SB.url || '').replace(/\/$/, '');
const sbReady = () => !!(SB_URL && SB.anonKey && !/PASTE-|YOUR-/.test(SB_URL + SB.anonKey));
const API = SB_URL ? SB_URL + '/functions/v1/khayr-api' : '';

const TYPES = {
  perfume: {key:'perfume', sizes:[3,6,10,15,30], page:'perfumes.html', word:'perfume', words:'perfumes', all:'All Perfumes', group:'PERFUME DECANTS', title:'Perfume Decants',
            cats:[['niche','Niche'],['designer','Designer'],['middle_eastern','Middle Eastern']]},
  attar:   {key:'attar', sizes:[1,3,6,12], page:'attar.html', word:'attar', words:'attars', all:'All Attars', group:'ATTAR', title:'Attar Collection',
            cats:[['natural','Natural'],['semi_natural','Semi-Natural'],['synthetic','Synthetic']]}
};
const TYPE_KEYS = ['perfume', 'attar'];
const PT = TYPES[PAGE] || null;                      // the product type of this page (null on Home/Privacy)

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
const catLabel = (type, c) => ((TYPES[type] || TYPES.perfume).cats.find(x => x[0] === c) || [])[1] || '';
const norm = s => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();   // Rosé = Rose
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
const pxItem = (p, size) => ({id: p.id, quantity: 1, item_price: priceOf(p, size)});

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
const GEN_DEFAULTS = {whatsapp:'8801673080800', orderNote:''};
let GEN = {...GEN_DEFAULTS};
const SET = {perfume: null, attar: null};          // ML settings per type (null = not set up)
let ALL = [];                                       // every product we know (visible ones)
let products = [];                                  // products that can be ordered right now

const priceOf = (p, s) => p ? Number((p.prices || {})[s]) || 0 : 0;
const sizeOn = (type, s) => !!SET[type] && (SET[type].sizesEnabled || {})[s] !== false;
const activeSizes = type => TYPES[type].sizes.filter(s => sizeOn(type, s));
const sizesFor = p => activeSizes(p.type).filter(s => (p.sizes || {})[s] !== false && priceOf(p, s) > 0);
const findP = (id, type) => ALL.find(p => p.id === id && (!type || p.type === type));
const ofType = type => products.filter(p => p.type === type);
const imgUrl = path => path && SB_URL ? `${SB_URL}/storage/v1/object/public/${BUCKET}/${String(path).split('/').map(encodeURIComponent).join('/')}` : '';

async function fetchData(){
  if(sbReady()){
    try{
      const h = {apikey: SB.anonKey, Authorization: 'Bearer ' + SB.anonKey};
      const base = SB_URL + '/rest/v1/';
      const cols = 'id,product_type,number,name,brand,category,prices,sizes,visible,image_path,thumb_path';
      const get = c => fetch(base + 'products?select=' + c + '&visible=eq.true&order=number.asc', {headers: h, cache: 'no-store'});
      const [pr0, st] = await Promise.all([get(cols), fetch(base + 'settings?select=id,data&id=in.(1,2)', {headers: h, cache: 'no-store'})]);
      const pr = pr0.status === 400 ? await get(cols.replace('product_type,', '')) : pr0;     // database not upgraded yet
      if(pr.ok && st.ok){
        const list = await pr.json(), rows = await st.json();
        const row = id => (rows.find(r => Number(r.id) === id) || {}).data;
        if(list.length) return {settings: {perfume: row(1) || null, attar: row(2) || null}, products: list, live: true};
      }
    }catch(e){ /* use the backup list below */ }
  }
  const r = await fetch('products.json?v=' + Date.now(), {cache: 'no-store'});
  if(!r.ok) throw new Error('load');
  const j = await r.json();
  if(j.settings && !('perfume' in j.settings)) j.settings = {perfume: j.settings, attar: null};    // old file format
  return j;
}

/* Bottle Photos (table gallery_photos). Empty list if not set up yet. */
let galleryCache = null;
async function fetchGallery(){
  if(galleryCache) return galleryCache;
  galleryCache = (async () => {
    if(!sbReady()) return [];
    try{
      const r = await fetch(SB_URL + '/rest/v1/gallery_photos?select=id,kind,image_path,thumb_path,caption,sort_order&visible=eq.true&order=sort_order.asc,created_at.asc',
        {headers: {apikey: SB.anonKey, Authorization: 'Bearer ' + SB.anonKey}, cache: 'no-store'});
      if(!r.ok) return [];
      const list = await r.json();
      return Array.isArray(list) ? list.filter(g => g && g.image_path && (g.kind === 'decant' || g.kind === 'attar')) : [];
    }catch(e){ return []; }
  })();
  return galleryCache;
}

/* ---------- start ---------- */
const params = new URLSearchParams(location.search);
async function load(){
  initPixel();
  // Home links like ?type=attar go straight to the right page (ad links keep their utm tags)
  if(PAGE === 'home' && TYPES[params.get('type')]) { goToTypePage(params.get('type')); return; }
  let data;
  try { data = await fetchData(); }
  catch(e){ showLoadError(); return; }
  const s = data.settings || {};
  GEN = {...GEN_DEFAULTS, ...(s.perfume || {})};
  SET.perfume = s.perfume ? {...s.perfume, sizesEnabled: s.perfume.sizesEnabled || {}} : null;
  SET.attar = s.attar ? {...s.attar, sizesEnabled: s.attar.sizesEnabled || {}} : null;
  ALL = (data.products || []).map((p, i) => ({...p, type: TYPES[p.product_type] ? p.product_type : 'perfume', no: Number(p.number) || (i + 1), prices: p.prices || {}, sizes: p.sizes || {}, category: normCat(p.category)}))
    .filter(p => p.visible !== false)
    .sort((a, b) => a.type === b.type ? a.no - b.no : a.type === 'perfume' ? -1 : 1);
  products = ALL.filter(p => sizesFor(p).length);
  const wa = String(GEN.whatsapp).replace(/\D/g, '');
  document.querySelectorAll('[data-wa]').forEach(a => { a.href = 'https://wa.me/' + wa; a.textContent = '+' + wa; });
  loadCart();
  if(PAGE === 'home') initHome();
  else if(PT) initShop();
  else if(PAGE === 'bottles') initBottles();
  updateCartUI();
  restoreLastAction();
}
function showLoadError(){
  const g = $('grid') || $('collections');
  if(g) g.innerHTML = '<div class="loading">The price list could not load. Check your internet and refresh the page.</div>';
}
function goToTypePage(type, extra){
  const u = new URLSearchParams(location.search);
  u.delete('type');
  Object.entries(extra || {}).forEach(([k, v]) => v == null ? u.delete(k) : u.set(k, v));
  const q = u.toString();
  location.replace(TYPES[type].page + (q ? '?' + q : '') + location.hash);
}

/* ================= HOME ================= */
function initHome(){
  // ?product=ID or ?category=niche on the Home link: send to the right page
  const pid = params.get('product');
  if(pid){ const p = findP(pid); if(p){ goToTypePage(p.type); return; } }
  const cat = normCat(params.get('category'));
  if(cat){ const t = TYPE_KEYS.find(k => TYPES[k].cats.some(c => c[0] === cat)); if(t){ goToTypePage(t, {category: cat}); return; } }

  TYPE_KEYS.forEach(t => {
    const n = ofType(t).length, el = $('count-' + t);
    if(el) el.textContent = n ? `${n} ${n === 1 ? TYPES[t].word : TYPES[t].words} available` : 'Coming soon';
  });
  const links = [];
  TYPE_KEYS.forEach(t => TYPES[t].cats.forEach(([c, label]) => {
    if(ofType(t).some(p => p.category === c)) links.push(`<a href="${TYPES[t].page}?category=${c}">${esc(label)} ${t === 'perfume' ? 'Perfumes' : 'Attar'}</a>`);
  }));
  if(links.length){ $('catLinks').innerHTML = links.join(''); $('catSection').hidden = false; }
  initHomeSearch();
  if(location.hash === '#search') setTimeout(() => $('q').focus(), 100);
  const pics = list => list.map(p => imgUrl(p.thumb_path || p.image_path)).filter(Boolean);
  const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  setArt('perfume', shuffle(pics(ofType('perfume').filter(p => p.thumb_path || p.image_path))));
  const attarProducts = shuffle(pics(ofType('attar').filter(p => p.thumb_path || p.image_path)));
  setArt('attar', attarProducts);
  fetchGallery().then(g => {
    const att = g.filter(x => x.kind === 'attar').map(x => imgUrl(x.thumb_path || x.image_path)).filter(Boolean);
    if(att.length) setArt('attar', shuffle(att).concat(attarProducts));
    const strip = g.slice(0, 4);
    if(strip.length){
      $('bstrip').innerHTML = strip.map(x => `<a href="bottles.html?type=${x.kind}" aria-label="${x.kind === 'attar' ? 'Attar' : 'Decant'} bottle photo"><img src="${esc(imgUrl(x.thumb_path || x.image_path))}" alt="${esc(x.caption || (x.kind === 'attar' ? 'Attar bottle' : 'Decant bottle'))}" loading="lazy" width="400" height="400"></a>`).join('');
      $('bstrip').hidden = false;
    }
  });
}
/* Collection cards: up to 3 real photos fanned out; the drawing stays if there are none */
function setArt(type, urls){
  const box = $('art-' + type); if(!box || !urls.length) return;
  const use = urls.slice(0, 3);
  const img = new Image();
  img.onload = () => {
    box.innerHTML = `<div class="fan n${use.length}">${use.map(u => `<img src="${esc(u)}" alt="" width="400" height="400" decoding="async">`).join('')}</div>`;
    box.querySelectorAll('img').forEach(i => i.addEventListener('error', () => i.remove()));
  };
  img.src = use[0];                                   // only swap in photos once the first one really loads
}

/* ================= BOTTLE PHOTOS ================= */
let gList = [], gKind = 'decant', gAt = 0;
async function initBottles(){
  gKind = params.get('type') === 'attar' ? 'attar' : 'decant';
  const all = await fetchGallery();
  const draw = () => {
    document.querySelectorAll('.tabs [data-kind]').forEach(b => b.setAttribute('aria-selected', b.dataset.kind === gKind));
    $('gallery').setAttribute('aria-labelledby', 'tab-' + gKind);
    gList = all.filter(x => x.kind === gKind);
    $('gallery').innerHTML = gList.length
      ? gList.map((x, i) => `<button type="button" class="gitem" data-gi="${i}" aria-label="Open photo${x.caption ? ': ' + esc(x.caption) : ''}"><span class="ph2"><img src="${esc(imgUrl(x.thumb_path || x.image_path))}" alt="${esc(x.caption || (gKind === 'attar' ? 'Attar bottle' : 'Decant bottle'))}" loading="lazy" width="400" height="400"></span>${x.caption ? `<span class="cap">${esc(x.caption)}</span>` : ''}</button>`).join('')
      : `<div class="empty"><strong>Photos coming soon.</strong><p>${gKind === 'attar' ? 'Attar bottle' : 'Decant bottle'} photos will appear here.</p><a class="btn" href="${gKind === 'attar' ? 'attar.html' : 'perfumes.html'}">${gKind === 'attar' ? 'Explore Attar Collection' : 'Explore Perfume Decants'}</a></div>`;
  };
  draw();
  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-kind]'); if(!b || b.dataset.kind === gKind) return;
    gKind = b.dataset.kind; draw();
    try { const u = new URLSearchParams(location.search); u.set('type', gKind); history.replaceState(null, '', location.pathname + '?' + u); } catch(_){}
  });
  document.querySelector('.tabs').addEventListener('keydown', e => {
    if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const other = document.querySelector(`.tabs [data-kind="${gKind === 'decant' ? 'attar' : 'decant'}"]`); other.click(); other.focus();
  });
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
let gReturn = null;
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
function searchList(list, raw){
  const q = norm(String(raw).replace(/^\s*#/, '')), words = q.split(' ').filter(Boolean), isNum = /^\d+$/.test(q);
  if(!words.length) return list;
  return list.filter(p => {
    if(isNum && p.no === Number(q)) return true;
    const hay = norm(`${p.name} ${p.brand || ''} ${catLabel(p.type, p.category)}`);
    return words.every(w => hay.includes(w)) || hay.replace(/ /g, '').includes(words.join(''));
  }).sort((a, b) => isNum ? (b.no === Number(q)) - (a.no === Number(q)) : 0);
}
function initHomeSearch(){
  const box = $('results'), input = $('q');
  const draw = () => {
    const raw = input.value; $('searchBox').classList.toggle('has', !!raw);
    if(clean(raw).length < 1){ box.classList.remove('show'); box.innerHTML = ''; return; }
    let html = '', total = 0;
    TYPE_KEYS.forEach(t => {
      const found = searchList(ofType(t), raw); total += found.length;
      if(!found.length) return;
      html += `<h3>${TYPES[t].group}</h3>` + found.slice(0, 8).map(p =>
        `<a href="${TYPES[t].page}?product=${encodeURIComponent(p.id)}"><span>#${p.no} ${esc(p.name)}</span><span>from ${price(Math.min(...sizesFor(p).map(s => priceOf(p, s))))}</span></a>`).join('')
        + (found.length > 8 ? `<a href="${TYPES[t].page}?q=${encodeURIComponent(raw)}"><span>See all ${found.length} results in ${TYPES[t].title}</span><span>→</span></a>` : '');
    });
    box.innerHTML = total ? html : '<div class="none">No products found. Try a shorter name or the product number.</div>';
    box.classList.add('show');
  };
  input.addEventListener('input', () => { draw(); searchEvent(input.value); });
  input.addEventListener('focus', () => { if(input.value) draw(); });
  input.addEventListener('keydown', e => {
    if(e.key === 'ArrowDown'){ const a = box.querySelector('a'); if(a){ e.preventDefault(); a.focus(); } }
    if(e.key === 'Escape'){ box.classList.remove('show'); }
    if(e.key === 'Enter'){ const a = box.querySelector('a'); if(a){ e.preventDefault(); location.href = a.href; } }
  });
  box.addEventListener('keydown', e => {
    const links = [...box.querySelectorAll('a')], i = links.indexOf(document.activeElement);
    if(e.key === 'ArrowDown' && i < links.length - 1){ e.preventDefault(); links[i + 1].focus(); }
    if(e.key === 'ArrowUp'){ e.preventDefault(); (i > 0 ? links[i - 1] : input).focus(); }
    if(e.key === 'Escape'){ box.classList.remove('show'); input.focus(); }
  });
  document.addEventListener('click', e => { if(!e.target.closest('.home-search')) box.classList.remove('show'); });
  $('clearQ').addEventListener('click', e => { e.preventDefault(); input.value = ''; draw(); input.focus(); });
}
let searchTimer, lastSearch = '';
function searchEvent(v){
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = clean(v);
    if(q.length >= 2 && q !== lastSearch){ lastSearch = q; px('Search', {search_string: q, content_category: PT ? PT.key : 'all'}); }
  }, 1500);
}

/* ================= PERFUME / ATTAR PAGE ================= */
const state = {q:'', size:'all', cat:'all', sort:'no', sel:{}, touched:{}};
function initShop(){
  const T = PT;
  // Deep links: ?product=ID  ?category=niche  ?size=6  ?q=oud
  const pid = params.get('product');
  if(pid){
    const other = findP(pid);
    if(other && other.type !== T.key){ goToTypePage(other.type); return; }
  }
  const cat = normCat(params.get('category'));
  if(cat){
    if(T.cats.some(c => c[0] === cat)) state.cat = cat;
    else { const t = TYPE_KEYS.find(k => TYPES[k].cats.some(c => c[0] === cat)); if(t && t !== T.key){ goToTypePage(t, {category: cat}); return; } }
  }
  const size = Number(params.get('size'));
  if(size && activeSizes(T.key).includes(size)) state.size = size;
  if(params.get('q')){ state.q = params.get('q').slice(0, 80); $('q').value = state.q; $('searchBox').classList.add('has'); }

  if(!ofType(T.key).length){
    $('tools').hidden = true; $('catFilter').hidden = true; $('metaRow').hidden = true;
    $('grid').innerHTML = `<div class="empty"><strong>${T.key === 'attar' ? 'Our Attar collection is coming soon.' : 'Perfumes are coming soon.'}</strong><p>Please check back shortly, or message us on WhatsApp.</p><a class="btn" href="${T.key === 'attar' ? TYPES.perfume.page : TYPES.attar.page}">Explore ${T.key === 'attar' ? 'Perfume Decants' : 'Attar Collection'}</a></div>`;
    if(pid) toast('This product is not available right now.');
    return;
  }
  buildFilters();
  bindShop();
  render();
  if(pid){
    const p = ofType(T.key).find(x => x.id === pid);
    if(p) showProduct(p);
    else toast('This product is not available right now.');
  }
}
function showProduct(p){
  // make sure no filter hides it
  if(!visibleList().includes(p)){ state.q = ''; state.size = 'all'; state.cat = 'all'; $('q').value = ''; $('searchBox').classList.remove('has'); buildFilters(); render(); }
  const el = document.querySelector(`[data-card="${CSS.escape(p.id)}"]`);
  if(el){
    el.classList.add('hl');
    setTimeout(() => el.scrollIntoView({block: 'center', behavior: 'smooth'}), 60);
    setTimeout(() => { const e2 = document.querySelector(`[data-card="${CSS.escape(p.id)}"]`); if(e2) e2.classList.remove('hl'); }, 4500);
  }
  viewContent(p);
}
function viewContent(p){
  const sizes = sizesFor(p);
  px('ViewContent', {content_ids: [p.id], content_type: 'product', content_name: p.name, content_category: p.type,
    value: sizes.length ? Math.min(...sizes.map(s => priceOf(p, s))) : 0, currency: 'BDT'});
}
function catsWithProducts(){
  const list = ofType(PT.key);
  return PT.cats.filter(([c]) => list.some(p => p.category === c) || state.cat === c);
}
function buildFilters(){
  const sizes = activeSizes(PT.key);
  if(state.size !== 'all' && !sizes.includes(state.size)) state.size = 'all';
  $('sizeFilter').innerHTML = ['all', ...sizes].map(s =>
    `<button class="chip" type="button" data-size="${s}" aria-pressed="${s === state.size}">${s === 'all' ? 'All sizes' : s + 'ml'}</button>`).join('');
  const cats = catsWithProducts();
  $('catFilter').hidden = !cats.length;
  $('catFilter').innerHTML = [['all', PT.all], ...cats].map(([c, label]) =>
    `<button class="chip" type="button" data-cat="${c}" aria-pressed="${c === state.cat}">${esc(label)}</button>`).join('');
}
function syncUrl(){
  try{
    const u = new URLSearchParams(location.search);
    u.delete('product');
    state.cat !== 'all' ? u.set('category', state.cat) : u.delete('category');
    state.size !== 'all' ? u.set('size', state.size) : u.delete('size');
    clean(state.q) ? u.set('q', clean(state.q)) : u.delete('q');
    const q = u.toString();
    history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
  }catch(e){}
}
function clearFilters(){
  state.q = ''; state.size = 'all'; state.cat = 'all'; state.touched = {};
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
    const z = e.target.closest('[data-zoom]');
    if(z){ openPhoto(z.dataset.zoom, z.dataset.alt); const p = findP(z.dataset.pid, PT.key); if(p) viewContent(p); return; }
    const v = e.target.closest('.box[data-size]');
    if(v){ selectSize(v.dataset.id, Number(v.dataset.size)); return; }
    const a = e.target.closest('[data-add]');
    if(a){
      const card = a.closest('.card'), on = card.querySelector('.box[aria-checked="true"]');
      if(!on){
        const bx = card.querySelector('.boxes'); bx.classList.remove('need'); void bx.offsetWidth; bx.classList.add('need');
        toast('Select a size first'); return;
      }
      addToCart(a.dataset.add, PT.key, Number(on.dataset.size)); return;
    }
    const c = e.target.closest('[data-copy]');
    if(c) copyPrices(c.dataset.copy);
  });
  grid.addEventListener('keydown', e => {
    const v = e.target.closest('.box[data-size]'); if(!v) return;
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const p = findP(v.dataset.id, PT.key), sizes = sizesFor(p);
    const i = sizes.indexOf(Number(v.dataset.size)) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
    selectSize(p.id, sizes[(i + sizes.length) % sizes.length], true);
  });
  /* broken or missing image -> neutral placeholder, never a broken icon */
  grid.addEventListener('error', e => {
    if(e.target.tagName !== 'IMG') return;
    const pic = e.target.closest('.pic'); if(!pic) return;
    pic.outerHTML = `<div class="pic" aria-hidden="true"><div class="ph ${PT.key === 'attar' ? 'attar' : ''}"></div></div>`;
  }, true);
}
function visibleList(){
  const raw = state.q;
  let list = searchList(ofType(PT.key), raw).filter(p => {
    if(state.size !== 'all' && !sizesFor(p).includes(state.size)) return false;
    if(state.cat !== 'all' && p.category !== state.cat) return false;
    return true;
  });
  const q = norm(String(raw).replace(/^\s*#/, '')), isNum = /^\d+$/.test(q);
  const ref = p => state.size !== 'all' ? priceOf(p, state.size) : Math.min(...sizesFor(p).map(s => priceOf(p, s)));
  if(state.sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
  else if(state.sort === 'low') list.sort((a, b) => ref(a) - ref(b));
  else if(state.sort === 'high') list.sort((a, b) => ref(b) - ref(a));
  else list.sort((a, b) => a.no - b.no);
  if(isNum && state.sort === 'no') list.sort((a, b) => (b.no === Number(q)) - (a.no === Number(q)));   // exact number first
  return list;
}
function cardHTML(p){
  const cols = activeSizes(p.type), avail = sizesFor(p);
  let sel = state.sel[p.id];
  if(state.size !== 'all' && avail.includes(state.size) && !state.touched[p.id]) sel = state.size;
  if(!avail.includes(sel)) sel = null;
  const inCart = !!sel && cart.some(i => i.id === p.id && i.type === p.type && i.size === sel);
  const thumb = imgUrl(p.thumb_path || p.image_path), full = imgUrl(p.image_path || p.thumb_path);
  const pic = thumb
    ? `<button class="pic zoom" type="button" data-zoom="${esc(full)}" data-pid="${esc(p.id)}" data-alt="${esc(p.name)}" aria-label="View photo of ${esc(p.name)}"><img src="${esc(thumb)}" alt="${esc(p.name)}" width="400" height="400" loading="lazy" decoding="async"></button>`
    : `<div class="pic" aria-hidden="true"><div class="ph ${p.type === 'attar' ? 'attar' : ''}"></div></div>`;
  const boxes = cols.map(s => avail.includes(s)
    ? `<button class="box" type="button" role="radio" aria-checked="${s === sel}" data-id="${esc(p.id)}" data-size="${s}" aria-label="${s}ml, ${price(priceOf(p, s))}" tabindex="${(sel ? s === sel : s === avail[0]) ? 0 : -1}"><span class="ml">${s}ml</span><span class="pr">${price(priceOf(p, s))}</span></button>`
    : `<span class="box gap" aria-hidden="true"></span>`).join('');
  const brand = clean(p.brand), cat = catLabel(p.type, p.category);
  return `<article class="card" data-card="${esc(p.id)}" id="p-${esc(p.id)}">
    ${pic}
    <div class="info">
      <div class="head">
        <div><div class="no">#${p.no}</div><h2>${esc(p.name)}</h2>${brand ? `<div class="brand">Brand: ${esc(brand)}</div>` : ''}${cat ? `<span class="tag">${esc(cat)}</span>` : ''}</div>
        <button class="copy" type="button" data-copy="${esc(p.id)}" aria-label="Copy prices for ${esc(p.name)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Copy</button>
      </div>
      <div class="boxes" role="radiogroup" aria-label="Choose size for ${esc(p.name)}" style="grid-template-columns:repeat(${Math.max(cols.length, 1)},minmax(0,1fr))">${boxes}</div>
      <button class="add ${inCart ? 'done' : ''}" type="button" data-add="${esc(p.id)}">${inCart ? 'Added ✓' : sel ? `Add ${sel}ml to cart` : 'Add to cart'}</button>
    </div>
  </article>`;
}
function render(){
  const list = visibleList(), T = PT;
  const filtered = !!clean(state.q) || state.size !== 'all' || state.cat !== 'all';
  $('clearF').hidden = !filtered;
  $('count').textContent = `${list.length} ${list.length === 1 ? T.word : T.words}`;
  if(!list.length){
    $('grid').innerHTML = `<div class="empty"><strong>No products found.</strong><p>${clean(state.q) ? 'Try the product number, or a shorter name.' : 'Nothing matches these filters right now.'}</p><button type="button" data-clear>Clear Filters</button></div>`;
    $('grid').querySelector('[data-clear]').onclick = clearFilters;
    return;
  }
  $('grid').innerHTML = list.map(cardHTML).join('');
}
function refreshCard(id){
  const el = document.querySelector(`[data-card="${CSS.escape(id)}"]`), p = PT && findP(id, PT.key);
  if(el && p) el.outerHTML = cardHTML(p);
}
function selectSize(id, size, focus){
  state.sel[id] = size; state.touched[id] = true;
  refreshCard(id);
  if(focus){ const b = document.querySelector(`[data-card="${CSS.escape(id)}"] .box[data-size="${size}"]`); if(b) b.focus(); }
}
async function copyPrices(id){
  const p = findP(id, PT.key);
  const text = `#${p.no} ${p.name}${p.type === 'attar' ? ' (Attar)' : ''}\n` + sizesFor(p).map(s => `${s}ml — ${price(priceOf(p, s))}`).join('\n');
  toast(await copyText(text) ? 'Prices copied ✓' : 'Copy failed. Press and hold to copy.');
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

/* ================= CART (one shared cart for perfume + attar, no quantity) ================= */
let cart = [];                                       // [{id, type, size}]
function loadCart(){
  let raw = ls.get('khayr_cart', []);
  if(!Array.isArray(raw)) raw = [];
  const oldAttar = ls.get('khayr_attar_cart', null);  // cart from the old separate Attar website
  if(Array.isArray(oldAttar) && oldAttar.length){ raw = raw.concat(oldAttar.map(i => ({...i, type: 'attar'}))); }
  ls.del('khayr_attar_cart');
  const out = [];
  raw.forEach(i => {
    if(!i || !i.id) return;
    const p = findP(i.id, TYPES[i.type] ? i.type : null) || findP(i.id);
    const size = Number(i.size);
    if(!p || !sizesFor(p).includes(size)) return;
    if(out.some(x => x.id === p.id && x.type === p.type && x.size === size)) return;
    out.push({id: p.id, type: p.type, size});
  });
  if(out.length < raw.length) setTimeout(() => toast('Some items in your cart are no longer available and were removed.'), 300);
  cart = out;
}
const subtotal = () => cart.reduce((t, i) => t + priceOf(findP(i.id, i.type), i.size), 0);
function updateCartUI(){
  ls.set('khayr_cart', cart);
  const n = cart.length;
  $('cartLabel').textContent = `Cart (${n})`;
  document.body.classList.toggle('has-bar', n > 0);
  $('barText').innerHTML = `Cart <span class="dot">•</span> ${n} item${n === 1 ? '' : 's'} <span class="dot">•</span> ${price(subtotal())}`;
}
function addToCart(id, type, size){
  const p = findP(id, type);
  if(!p) return;
  if(cart.some(i => i.id === id && i.type === type && i.size === size)){ toast(`${size}ml is already in your cart`); return; }
  cart.push({id, type, size});
  updateCartUI(); refreshCard(id);
  toast(`Added ✓ #${p.no} ${p.name}, ${size}ml`);
  px('AddToCart', {content_ids: [p.id], content_type: 'product', content_name: p.name, content_category: p.type, contents: [pxItem(p, size)], value: priceOf(p, size), currency: 'BDT'});
  if(document.body.classList.contains('open')) renderDrawer();
}
function removeFromCart(idx){
  const [gone] = cart.splice(idx, 1);
  updateCartUI(); refreshCard(gone.id);
  renderDrawer();
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
/* One checkout = one clientRef. Copy and WhatsApp for the same cart + details give the SAME Order ID.
   The Order ID itself (KH-20261011-001) is made by the server. */
let draft = ls.get('khayr_order_v4', null);          // {sig, ref, at, orderId, methods, offline, lead}
let lastAction = null;                               // {method, orderId, sig}
let notice = null;                                   // {kind:'warn'|'ok', title, text}
let busy = false;
function sigNow(){
  const d = details();
  return JSON.stringify([cart.map(i => i.type + ':' + i.id + ':' + i.size), d.name, d.phone, d.email, d.address, d.area]);
}
function currentDraft(){
  const sig = sigNow();
  if(!draft || draft.sig !== sig || Date.now() - (draft.at || 0) > 6 * 36e5){
    draft = {sig, ref: newId(), at: Date.now(), orderId: null, methods: [], offline: false, lead: false};
    saveDraft();
  }
  return draft;
}
const saveDraft = () => ls.set('khayr_order_v4', draft);
function grouped(){
  return TYPE_KEYS.map(t => ({type: t, items: cart.filter(i => i.type === t).map(i => ({...i, p: findP(i.id, i.type)}))})).filter(g => g.items.length);
}
function orderText(orderId){
  const d = details();
  return [
    SHOP + ' ORDER', '',
    orderId ? `Order ID: ${orderId}` : null, orderId ? '' : null,
    `Name: ${d.name}`,
    `Phone: ${d.phone}`,
    d.email ? `Email: ${d.email}` : null,
    `Address: ${d.address}`,
    `Delivery Area: ${d.area}`, '',
    grouped().map(g => TYPES[g.type].group + '\n' + g.items.map(i => `#${i.p.no} ${i.p.name}\n${i.size}ml — ${price(priceOf(i.p, i.size))}`).join('\n\n')).join('\n\n'), '',
    `Total: ${price(subtotal())}`
  ].filter(l => l !== null).join('\n');
}
function pxContents(){
  return {content_ids: cart.map(i => i.id), contents: cart.map(i => pxItem(findP(i.id, i.type), i.size)), content_type: 'product', num_items: cart.length, value: subtotal(), currency: 'BDT'};
}

/* Save the order on the server. Returns {ok:true, orderId} or {ok:false} (the message is already shown). */
async function submit(method, retried){
  const dr = currentDraft();
  const body = {
    action: 'create_order', clientRef: dr.ref, method,
    customer: details(), items: cart.map(i => ({id: i.id, type: i.type, size: i.size})), expectedTotal: subtotal(),
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
    if(!dr.methods.includes(method)) dr.methods.push(method);
    if(!dr.lead){
      dr.lead = true;
      px('Lead', {...pxContents(), value: Number(j.total) || subtotal()}, j.leadEventId || ('lead-' + j.orderId));
    }
    saveDraft(); notice = null;
    return {ok: true, orderId: j.orderId};
  }
  if(r.status === 409 && j){
    if(j.code === 'ref_mismatch' && !retried){ dr.ref = newId(); dr.orderId = null; dr.methods = []; dr.lead = false; saveDraft(); return submit(method, true); }
    (j.prices || []).forEach(x => { const p = findP(x.id, x.type); if(p && x.price > 0) p.prices[x.size] = Number(x.price); });
    if(j.code === 'unavailable'){
      const gone = [];
      (j.problems || []).forEach(x => {
        const k = cart.findIndex(i => i.id === x.id && i.type === x.type && String(i.size) === String(x.size));
        if(k > -1){ const p = findP(x.id, x.type); gone.push(`${p ? '#' + p.no + ' ' + p.name : 'An item'} ${x.size}ml`); cart.splice(k, 1); }
      });
      notice = {kind: 'warn', title: 'Some items are no longer available', text: (gone.length ? gone.join(', ') + ' removed from your cart. ' : '') + 'Please check your cart and tap again.'};
    } else {
      notice = {kind: 'warn', title: 'Some prices were updated', text: `Please check the new total (${price(subtotal())}) and tap again to order.`};
    }
    products = ALL.filter(p => sizesFor(p).length);
    updateCartUI(); if(PT) render(); renderDrawer();
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
  const b = $(which); if(b && on) b.querySelector('span').textContent = 'Saving your order…';
}
const isMobile = () => /Android|iPhone|iPad|iPod|Mobile|Silk|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
const waUrl = text => 'https://wa.me/' + String(GEN.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(text);
function done(method, orderId){
  lastAction = {method, orderId: orderId || null, sig: draft.sig};
  ss.set('khayr_last', lastAction);
  notice = null;
  px(method === 'WhatsApp' ? 'WhatsAppOrder' : 'CopyOrder', {...pxContents(), order_id: orderId || ''}, null, true);
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
    const sig = cart.map(i => i.type + ':' + i.id + ':' + i.size).join('|');
    if(ss.get('khayr_ic', '') !== sig){ ss.set('khayr_ic', sig); px('InitiateCheckout', pxContents()); }
  }
  setTimeout(() => $('closeCart').focus(), 60);
}
function closeCart(){ document.body.classList.remove('open'); $('drawer').setAttribute('aria-hidden', 'true'); $('cartBtn').focus(); }
$('cartBtn').onclick = openCart; $('bar').onclick = openCart;
$('closeCart').onclick = closeCart; $('scrim').onclick = closeCart;
document.addEventListener('keydown', e => {
  if(e.key !== 'Escape') return;
  if($('lb').classList.contains('show')) closePhoto();
  else if(document.body.classList.contains('open')) closeCart();
  else if(document.body.classList.contains('menu')) closeMenu();
});
function restoreLastAction(){
  const la = ss.get('khayr_last', null);
  if(la && cart.length && la.sig === sigNow()) lastAction = la;
}

const WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.4-.3Z"/></svg>';
const COPY_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
function renderDrawer(){
  const body = $('dbody'), foot = $('dfoot'), keep = body.scrollTop;
  $('cartTitle').textContent = cart.length ? `Your cart (${cart.length})` : 'Your cart';
  if(!cart.length){
    body.innerHTML = `<div class="cart-empty"><p><strong>Your cart is empty.</strong></p><p>Select a size on any product, then tap Add to cart.</p>
      <div class="row"><a href="${TYPES.perfume.page}">Perfume Decants</a><a href="${TYPES.attar.page}">Attar</a></div></div>`;
    foot.innerHTML = '';
    if(notice) body.insertAdjacentHTML('afterbegin', `<div class="warn-msg" role="alert"><b>${esc(notice.title)}</b>${esc(notice.text)}</div>`);
    return;
  }
  const d = details();
  let idx = 0;
  const lines = grouped().map(g => `<div class="grp">${TYPES[g.type].group}</div>` + g.items.map(i => {
    const k = cart.indexOf(cart.find(c => c.id === i.id && c.type === i.type && c.size === i.size)); idx++;
    return `<div class="line">
      <div><div class="n">#${i.p.no} ${esc(i.p.name)}</div><div class="m">${i.size}ml</div></div>
      <div class="rt"><div class="lp">${price(priceOf(i.p, i.size))}</div><button type="button" class="rm" data-rm="${k}" aria-label="Remove ${esc(i.p.name)} ${i.size}ml">Remove</button></div>
    </div>`; }).join('')).join('');
  const sameOrder = lastAction && lastAction.sig === sigNow();
  body.innerHTML = lines + `
    <div class="total"><span>Total</span><span>${price(subtotal())}</span></div>
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
  else if(t.dataset.area){ saved.area = t.dataset.area; ls.set('khayr_customer', saved); delete errs.area; renderDrawer(); }
  else if(t.id === 'newOrder'){
    cart = []; draft = null; lastAction = null; notice = null; ls.del('khayr_order_v4'); ss.del('khayr_last');
    updateCartUI(); if(PT) render(); closeCart(); toast('Cart cleared');
  }
});

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
