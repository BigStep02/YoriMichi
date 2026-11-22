// 주변 맛집 목록: GET /api/restaurants/nearby, 상세는 GET /api/restaurants/{placeId}
// 백엔드 없이 화면만 볼 때는 ?mock=1
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { openRestaurantSheet as openDetail, priceLabel, walkLabel, typeChip } from './rsheet.js';
import { icons, esc, dpLight } from './icons.js';

renderHeader();
document.getElementById('back-link').insertAdjacentHTML('afterbegin', icons.back());

const MOCK = new URLSearchParams(location.search).get('mock') === '1';
const listEl = document.getElementById('list');
const countEl = document.querySelector('[data-count]');

const opts = { category: ['ALL'], sort: 'SCORE', radiusM: '800', openNow: false };
let loc = null;
let seq = 0;
let lastData = null;

// ---------- 조건 ----------
const catGroup = document.querySelector('.chips[data-multi]');
catGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-v]');
  if (!btn) return;
  const btns = [...catGroup.querySelectorAll('button')];
  const all = btns.find(b => b.dataset.v === 'ALL');
  if (btn === all) {
    btns.forEach(b => b.setAttribute('aria-pressed', String(b === all)));
  } else {
    btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
    const picked = btns.filter(b => b !== all && b.getAttribute('aria-pressed') === 'true');
    all.setAttribute('aria-pressed', String(picked.length === 0));
  }
  opts.category = btns.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v);
  load();
});

document.querySelectorAll('.seg[data-opt]').forEach(group => {
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-v]');
    if (!btn) return;
    group.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b === btn)));
    opts[group.dataset.opt] = btn.dataset.v;
    load();
  });
});

document.querySelector('[data-opt="openNow"]').addEventListener('change', (e) => {
  opts.openNow = e.target.checked;
  load();
});

// 축제 상세에서 넘어온 경우: ?lat=&lng=&near=축제이름 → 축제장 기준으로 고정
const qp = new URLSearchParams(location.search);
const fixLat = Number(qp.get('lat'));
const fixLng = Number(qp.get('lng'));
if (qp.has('lat') && qp.has('lng') && fixLat > 20 && fixLat < 46 && fixLng > 122 && fixLng < 154) {
  loc = { lat: fixLat, lng: fixLng };
  const near = qp.get('near') || '그곳';
  document.getElementById('search-bar').innerHTML = `
    <div class="near-pill">
      <span>📍 <b>${esc(near)}</b> 근처</span>
      <a href="/restaurants.html">내 위치로 보기</a>
    </div>`;
  document.querySelector('.draw-sub').textContent = '그곳에서 걸어갈 만한 곳을 보정 평점 순으로 보여 드려요.';
  load();
} else {
  mountSearchBar(document.getElementById('search-bar'), (state) => {
    loc = state.loc;
    load();
  }, { dates: false });
}

// ---------- 목록 ----------

async function load() {
  if (!loc && !MOCK) return;
  const mySeq = ++seq;
  countEl.textContent = '';
  listEl.innerHTML = '<div class="r-item skeleton-row" aria-hidden="true"></div>'.repeat(4);

  const q = new URLSearchParams({
    lat: (loc?.lat ?? 34.6687).toFixed(6),
    lng: (loc?.lng ?? 135.5013).toFixed(6),
    radiusM: opts.radiusM,
    category: opts.category.join(','),
    openNow: String(opts.openNow),
    sort: opts.sort,
  });

  let data;
  try {
    data = MOCK ? mockNearby() : await api(`/api/restaurants/nearby?${q}`, { auth: false });
  } catch (e) {
    if (mySeq !== seq) return;
    listEl.innerHTML = `<div class="empty-state"><h2>잠깐 문제가 생겼어요</h2><p class="muted">${esc(e.message)}</p></div>`;
    return;
  }
  if (mySeq !== seq) return;
  lastData = data;

  if (!data.restaurants?.length) {
    countEl.textContent = '';
    listEl.innerHTML = `
      <div class="empty-state">
        <h2>조건에 맞는 곳이 없어요</h2>
        <p class="muted">거리를 넓히거나 종류를 바꿔 보세요.</p>
      </div>`;
    return;
  }

  countEl.textContent = `${data.count}곳 · 평균 ★${data.avgRating.toFixed(1)}`;
  listEl.innerHTML = data.restaurants.map((r, i) => `
    <button type="button" class="r-item" data-i="${i}">
      ${opts.sort === 'SCORE' ? `<span class="r-rank${i < 3 ? ' top' : ''}">${i + 1}</span>` : ''}
      <span class="r-main">
        <span class="r-title" lang="ja">${esc(r.name)}</span>
        <span class="r-sub">
          ${typeChip(r, 'r-type')}
          ${r.openNow ? '<span class="open-dot">영업 중</span>' : ''}
        </span>
        <span class="r-meta">
          ${r.rating != null ? `<span class="star">★ ${r.rating.toFixed(1)}</span><span class="muted">(${r.ratingCount.toLocaleString()})</span>` : ''}
          <span class="sep">·</span><span>${walkLabel(r.distanceM)}</span>
          ${r.priceLevel != null ? `<span class="sep">·</span><span>${priceLabel(r.priceLevel)}</span>` : ''}
        </span>
      </span>
      ${icons.chevronRight('icon r-chev')}
    </button>`).join('');
}

listEl.addEventListener('click', (e) => {
  const item = e.target.closest('.r-item[data-i]');
  if (!item || !lastData) return;
  openDetail(lastData.restaurants[Number(item.dataset.i)]);
});

// ── 뽑기 패널 ──
const dpDrawBtn = document.getElementById('dp-draw-btn');
const dpResult  = document.getElementById('dp-result');
let dpExcluded  = [];

dpDrawBtn?.addEventListener('click', () => drawOne());

async function drawOne() {
  if (!loc && !MOCK) {
    dpDrawBtn.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 240 });
    return;
  }
  dpDrawBtn.textContent = '뽑는 중…';
  dpDrawBtn.closest('.draw-panel')?.classList.add('is-drawing');
  dpDrawBtn.disabled = true;

  const q = new URLSearchParams({
    lat: (loc?.lat ?? 34.6687).toFixed(6),
    lng: (loc?.lng ?? 135.5013).toFixed(6),
    radiusM: opts.radiusM,
    category: opts.category.join(','),
    openNow: String(opts.openNow),
  });
  if (dpExcluded.length) q.set('exclude', dpExcluded.join(','));

  let data;
  try {
    data = MOCK ? mockDrawOne() : await api(`/api/restaurants/draw?${q}`, { auth: false });
  } catch (e) {
    dpResult.innerHTML = `<p class="muted dp-msg">${esc(e.message)}</p>`;
    dpResult.hidden = false;
    dpDrawBtn.textContent = '뽑기';
    dpDrawBtn.disabled = false;
    dpDrawBtn.closest('.draw-panel')?.classList.remove('is-drawing');
    return;
  }
  dpDrawBtn.textContent = '다시 뽑기';
  dpDrawBtn.disabled = false;
  dpDrawBtn.closest('.draw-panel')?.classList.remove('is-drawing');

  if (!data?.pick) {
    dpResult.innerHTML = `<p class="muted dp-msg">조건에 맞는 곳이 없어요.${dpExcluded.length ? ' 거리를 넓혀보세요.' : ''}</p>`;
    dpResult.hidden = false;
    return;
  }

  const p = data.pick;
  dpExcluded.push(p.placeId);
  if (dpExcluded.length > 10) dpExcluded = dpExcluded.slice(-10);

  dpResult.innerHTML = `
    <div class="dp-pick">
      <div class="dp-pick-top">
        <span class="dp-seal" lang="ja">縁</span>
        ${typeChip(p)}
        ${p.openNow ? '<span class="open-badge">영업 중</span>' : ''}
      </div>
      <div class="dp-pick-name" lang="ja">${esc(p.name)}</div>
      <div class="dp-pick-meta">
        ${p.rating != null ? `<span class="star">★ ${p.rating.toFixed(1)}</span>` : ''}
        <span>${walkLabel(p.distanceM)}</span>
        ${p.priceLevel != null ? `<span>${priceLabel(p.priceLevel)}</span>` : ''}
      </div>
      <div class="dp-pick-actions">
        <button type="button" class="dp-main" data-dp-detail>가게 공개 · AI 요약</button>
        ${p.googleMapsUri ? `<a class="dp-ico" href="${esc(p.googleMapsUri)}" target="_blank" rel="noopener" aria-label="구글 지도" title="구글 지도">${icons.map('icon')}</a>` : ''}
        <button type="button" class="dp-ico" data-dp-swap aria-label="다시 뽑기" title="다시 뽑기">${icons.dice('icon')}</button>
      </div>
    </div>`;
  dpResult.hidden = false;
  dpLight();
  dpResult.querySelector('[data-dp-swap]').addEventListener('click', () => drawOne());
  dpResult.querySelector('[data-dp-detail]').addEventListener('click', () => openDetail(p));
}

function mockDrawOne() {
  const pool = [
    { placeId: 'mock-draw-0', name: '一蘭 道頓堀店本館', typeLabel: 'ラーメン屋', rating: 4.3, ratingCount: 9489, priceLevel: 2, openNow: true, distanceM: 340, googleMapsUri: 'https://maps.google.com' },
    { placeId: 'mock-draw-1', name: '道頓堀 今井',        typeLabel: 'うどん屋',    rating: 4.2, ratingCount: 2210, priceLevel: 2, openNow: true, distanceM: 450, googleMapsUri: 'https://maps.google.com' },
  ].filter(x => !dpExcluded.includes(x.placeId));
  if (!pool.length) return { pick: null };
  return { pick: pool[0], candidateCount: 12, poolCount: 5, radiusM: +opts.radiusM };
}

// ---------- 가짜 데이터 (?mock=1) ----------
function mockNearby() {
  const base = [
    ['一蘭 道頓堀店本館', 'ラーメン屋', 4.3, 9489, 2, 340],
    ['串かつ だるま 道頓堀店', '串揚げ店', 4.1, 3120, 1, 210],
    ['つるとんたん 宗右衛門町店', 'うどん屋', 4.0, 4987, 2, 520],
    ['道頓堀 今井', 'うどん屋', 4.2, 2210, 2, 450],
    ['金龍ラーメン 道頓堀店', 'ラーメン屋', 3.7, 6100, 1, 120],
    ['はり重 道頓堀本店', 'すき焼き店', 4.3, 1850, 4, 380],
  ].map(([name, typeLabel, rating, ratingCount, priceLevel, distanceM], i) => ({
    placeId: 'mock-' + i, name, typeLabel, rating, ratingCount, priceLevel, distanceM,
    openNow: i !== 2, googleMapsUri: 'https://maps.google.com',
  }));
  const list = opts.sort === 'DISTANCE' ? [...base].sort((a, b) => a.distanceM - b.distanceM) : base;
  return { restaurants: list, count: list.length, avgRating: 4.02, radiusM: +opts.radiusM, cached: false };
}
