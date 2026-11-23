// F-01 축제 목록
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { formatRange, dDayLabel, todayTokyo } from './dates.js';
import { regionKo } from './regions.js';
import { icons, esc, dpRun, dpShow } from './icons.js';
import { openFestivalSheet } from './festsheet.js';

renderHeader();
document.getElementById('back-link').insertAdjacentHTML('afterbegin', icons.back());

const RADII = [10, 30, 50];
const params = new URLSearchParams(location.search);
let radiusKm = RADII.includes(Number(params.get('radiusKm'))) ? Number(params.get('radiusKm')) : 30;

const noticeEl = document.getElementById('notice');
const countEl = document.getElementById('count');
const resultsEl = document.getElementById('results');
const radiusButtons = document.querySelectorAll('[data-radius]');
let requestSeq = 0;
let currentLoc  = null;
let lastList = [];
let dpSeen = [];
const dpResult = document.getElementById('dp-result');
let lastFallback = false;

function renderRadius() {
  radiusButtons.forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.radius) === radiusKm)));
}

function skeleton() {
  noticeEl.innerHTML = '';
  countEl.textContent = '';
  resultsEl.innerHTML = '<div class="f-item skeleton-row" aria-hidden="true"></div>'.repeat(3);
}

function dateBox(f) {
  if (f.ongoing) {
    const [, em, ed] = f.endDate.split('-').map(Number);
    return `<div class="date-box live"><div class="m">진행 중</div><div class="d">${ed}</div><div class="u">${em}월까지</div></div>`;
  }
  const [y, m, d] = f.startDate.split('-').map(Number);
  const yr = String(y) !== todayTokyo().slice(0, 4) ? `${String(y).slice(2)}년 ` : '';
  return `<div class="date-box"><div class="m">${yr}${m}월</div><div class="d">${d}</div></div>`;
}

function card(f, later) {
  const badge = f.ongoing
    ? '<span class="b-live">진행 중</span>'
    : `<span class="b-d">${dDayLabel(f.dDay, f.ongoing)}</span>`;
  return `
    <a class="f-item${later ? ' later' : ''}" href="/festival.html?id=${encodeURIComponent(f.id)}">
      ${dateBox(f)}
      <div class="f-main">
        <div class="f-top">${badge}</div>
        <div class="f-name">${esc(f.name)}</div>
        ${f.nameJa ? `<div class="f-ja" lang="ja">${esc(f.nameJa)}</div>` : ''}
        <div class="f-meta">${formatRange(f.startDate, f.endDate, later)} · ${esc(regionKo(f.prefecture, f.city))} · ${Number(f.distanceKm).toFixed(1)}km</div>
        ${!later && f.summary ? `<p class="f-sum">${esc(f.summary)}</p>` : ''}
      </div>
    </a>`;
}

function syncUrl({ from, to }) {
  const q = new URLSearchParams(location.search);
  q.set('from', from); q.set('to', to); q.set('radiusKm', radiusKm);
  history.replaceState(null, '', `?${q}`);
}

async function load(state) {
  const { loc, from, to } = state;
  currentLoc = loc;
  syncUrl(state);
  const seq = ++requestSeq;
  skeleton();

  const q = new URLSearchParams({ lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6), radiusKm, from, to });
  try {
    const data = await api(`/api/festivals?${q}`);
    if (seq !== requestSeq) return;
    const list = data.festivals || [];
    lastList = list; lastFallback = !!data.fallback;
    dpSeen = []; dpResult.hidden = true;

    if (!list.length) {
      noticeEl.innerHTML = `<div class="f-empty"><b>🏮 근처 100km 안에 등록된 축제가 없어요</b><span>위치를 다른 도시로 바꿔 보세요</span></div>`;
      resultsEl.innerHTML = '';
      return;
    }
    if (data.fallback) {
      noticeEl.innerHTML = `<div class="f-empty"><b>🏮 이 기간엔 근처 축제가 없어요</b><span>대신 가장 가까운 일정을 모았어요</span></div>`;
      countEl.textContent = '다가오는 축제';
      resultsEl.innerHTML = list.map(f => card(f, true)).join('');
      return;
    }
    noticeEl.innerHTML = data.searchedRadiusKm > radiusKm
      ? `<p class="f-widen">${radiusKm}km 안에 없어서 ${data.searchedRadiusKm}km까지 넓혀 찾았어요</p>` : '';
    countEl.textContent = `이 기간 ${list.length}개 · 가까운 순`;
    resultsEl.innerHTML = list.map(f => card(f, false)).join('');
  } catch (e) {
    if (seq !== requestSeq) return;
    noticeEl.innerHTML = `<div class="f-empty"><b>잠깐 문제가 생겼어요</b><span>${esc(e.message)}</span></div>`;
    resultsEl.innerHTML = `<div class="r-actions"><button type="button" class="btn-ghost" data-retry>다시 시도</button></div>`;
    resultsEl.querySelector('[data-retry]').addEventListener('click', () => onBar(bar.state));
  }
}


// 다른 화면에서 넘어온 경우: ?lat=&lng=&near=이름 → 그곳 기준으로 고정
function fixedFromQuery(q) {
  const la = Number(q.get('lat')), ln = Number(q.get('lng'));
  if (!(q.has('lat') && q.has('lng') && la > 20 && la < 46 && ln > 122 && ln < 154)) return null;
  return { lat: la, lng: ln, near: q.get('near') || '그곳' };
}
const fixed = fixedFromQuery(params);
const onBar = (st) => load(fixed ? { ...st, loc: { lat: fixed.lat, lng: fixed.lng } } : st);
const bar = mountSearchBar(document.getElementById('search-bar'), onBar);
if (fixed) {
  document.getElementById('search-bar').classList.add('fixed-loc');
  document.getElementById('search-bar').insertAdjacentHTML('beforebegin', `
    <div class="near-pill">
      <span>📍 <b>${esc(fixed.near)}</b> 근처 축제</span>
      <a href="/festivals.html">내 위치로 보기</a>
    </div>`);
}
skeleton();
radiusButtons.forEach(btn => btn.addEventListener('click', () => {
  radiusKm = Number(btn.dataset.radius);
  renderRadius();
  bar.refresh();
}));
renderRadius();

// ── 뽑기 패널: 지금 목록에서 축제 하나 ──
const dpDrawBtn = document.getElementById('dp-draw-btn');

dpDrawBtn?.addEventListener('click', () => drawOne());

let dpBusy = false;
async function drawOne() {
  if (dpBusy) return;
  if (!lastList.length) {
    dpShow(dpResult, '<p class="muted dp-msg">뽑을 축제가 없어요. 위치나 날짜를 바꿔 보세요.</p>', false);
    return;
  }
  let pool = lastList.filter(f => !dpSeen.includes(f.id));
  if (!pool.length) { dpSeen = []; pool = lastList; }
  const f = pool[Math.floor(Math.random() * pool.length)];
  dpSeen.push(f.id);

  dpBusy = true;
  dpDrawBtn.disabled = true;
  dpDrawBtn.textContent = '뽑는 중…';
  await dpRun(() => null);
  dpBusy = false;
  dpDrawBtn.disabled = false;

  dpShow(dpResult, `
    <div class="dp-pick">
      ${card(f, lastFallback)}
      <div class="dp-pick-actions">
        <a class="dp-main" data-fest-open href="/festival.html?id=${encodeURIComponent(f.id)}">축제 자세히 보기</a>
        <a class="dp-ico" href="/restaurants.html?lat=${f.lat}&lng=${f.lng}&near=${encodeURIComponent(f.name)}" aria-label="근처 맛집" title="근처 맛집">${icons.fork('icon')}</a>
        <a class="dp-ico dp-ico-txt" href="/spots.html?lat=${f.lat}&lng=${f.lng}&near=${encodeURIComponent(f.name)}" aria-label="근처 놀거리" title="근처 놀거리">⛩</a>
      </div>
    </div>`);
  dpDrawBtn.textContent = '다시 뽑기';
}

// 축제 상세: 맛집·놀거리처럼 시트로 열기 (새 탭·Ctrl 클릭은 원래 페이지로)
function openFromLink(e) {
  const a = e.target.closest('a.f-item, a[data-fest-open]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  const id = new URL(a.href, location.href).searchParams.get('id');
  const f = lastList.find(x => String(x.id) === id);
  if (!f) return;
  e.preventDefault();
  openFestivalSheet(f);
}
// router.js가 document 캡처 단계에서 링크를 가로채므로, 그보다 먼저 도는 window 캡처에서 처리
window.addEventListener('click', (e) => {
  if (!resultsEl.isConnected || !(resultsEl.contains(e.target) || dpResult.contains(e.target))) return;
  openFromLink(e);
}, true);
