// 주변 맛집 목록: GET /api/restaurants/nearby, 상세는 GET /api/restaurants/{placeId}
// 백엔드 없이 화면만 볼 때는 ?mock=1
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { mountSheet } from './sheet.js';
import { icons, esc } from './icons.js';

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
  const near = qp.get('near') || '축제장';
  document.getElementById('search-bar').innerHTML = `
    <div class="near-pill">
      <span>🏮 <b>${esc(near)}</b> 근처</span>
      <a href="/restaurants.html">내 위치로 보기</a>
    </div>`;
  document.querySelector('.draw-sub').textContent = '축제장에서 걸어갈 만한 곳을 보정 평점 순으로 보여 드려요.';
  load();
} else {
  mountSearchBar(document.getElementById('search-bar'), (state) => {
    loc = state.loc;
    load();
  }, { dates: false });
}

// ---------- 목록 ----------
function priceLabel(level) {
  if (level == null) return '';
  return level === 0 ? '무료' : '¥'.repeat(level);
}
function walkLabel(m) {
  const min = Math.max(1, Math.round(m / 80));
  return `도보 ${min}분 · ${m >= 1000 ? (m / 1000).toFixed(1) + 'km' : m + 'm'}`;
}

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
          ${r.typeLabel ? `<span lang="ja">${esc(r.typeLabel)}</span>` : ''}
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

// ---------- 상세 시트 ----------
async function openDetail(p) {
  const stats = [
    p.rating != null ? `<span class="star">★ ${p.rating.toFixed(1)}</span> <span class="muted">(${p.ratingCount.toLocaleString()})</span>` : '',
    walkLabel(p.distanceM),
    priceLabel(p.priceLevel),
  ].filter(Boolean).join('<span class="dot">·</span>');

  const body = `
    <div class="result-top">
      ${p.typeLabel ? `<span class="type-chip" lang="ja">${esc(p.typeLabel)}</span>` : ''}
      ${p.openNow ? '<span class="open-badge">영업 중</span>' : ''}
    </div>
    <h3 class="r-name" lang="ja">${esc(p.name)}</h3>
    <p class="r-name-ko" data-name-ko></p>
    <div class="r-stats">${stats}</div>
    <section class="ai-box" data-ai>
      <div class="ai-head">리뷰 한눈에 <span class="ai-tag">AI 요약</span></div>
      <div class="ai-body"><div class="sk-line"></div><div class="sk-line short"></div></div>
    </section>
    <section class="reviews" data-reviews></section>
    <p class="attribution">가게 정보·리뷰: Google 지도</p>`;
  const footer = `
    <div class="r-actions" style="margin-top:0">
      <a class="btn-primary" href="${esc(p.googleMapsUri)}" target="_blank" rel="noopener">${icons.map('icon')} 구글 지도에서 길찾기</a>
      <a class="btn-sub" href="https://tabelog.com/rstLst/?vs=1&sk=${encodeURIComponent(p.name)}&sw=${encodeURIComponent(p.name)}" target="_blank" rel="noopener"><span lang="ja">食べログ</span>에서 보기 ↗</a>
    </div>`;
  const wrap = mountSheet('가게 정보', body, { footer });

  const detailP = MOCK ? mockDetail() : api(`/api/restaurants/${encodeURIComponent(p.placeId)}`, { auth: false }).catch(() => null);
  const summaryP = MOCK ? mockSummary() : detailP.then(() => api(`/api/restaurants/${encodeURIComponent(p.placeId)}/summary`, { auth: false }).catch(() => null));

  const d = await detailP;
  if (!wrap.isConnected) return;
  if (d?.nameKo && d.nameKo !== p.name) wrap.querySelector('[data-name-ko]').textContent = d.nameKo;
  const reviews = (d?.reviews || []).slice(0, 2);
  wrap.querySelector('[data-reviews]').innerHTML = reviews.length ? `
    <div class="rv-head">최근 리뷰</div>
    ${reviews.map(r => `
      <div class="rv">
        <div class="rv-meta">
          ${r.authorUri ? `<a href="${esc(r.authorUri)}" target="_blank" rel="noopener">${esc(r.author)}</a>` : esc(r.author)}
          <span class="star">${'★'.repeat(Math.round(r.rating || 0))}</span>
          <span class="muted">${esc(r.relativeTime || '')}</span>
        </div>
        <p class="rv-text">${esc(r.text)}</p>
      </div>`).join('')}` : '';

  const s = await summaryP;
  if (!wrap.isConnected) return;
  applySheetSummary(wrap, p.placeId, s, s?.reviewsUri || p.googleMapsUri);
}

async function applySheetSummary(wrap, placeId, s, fallbackLink) {
  const aiEl = wrap.querySelector('[data-ai]');
  if (!aiEl) return;

  if (s?.status === 'OK' && (s.pros?.length || s.cons?.length || s.menus?.length)) {
    const row = (label, cls, items) => items?.length
      ? `<div class="ai-row ${cls}"><span class="ai-k">${label}</span><span>${items.map(esc).join(', ')}</span></div>` : '';
    const attr = s.reviewsUri
      ? `<p class="ai-attr">Google 리뷰 요약 기반 · ${esc(s.reviewSummaryDisclosure || '')} · <a href="${esc(s.reviewsUri)}" target="_blank" rel="noopener">리뷰 보기 ↗</a></p>` : '';
    const fullText = s.fullKo || s.reviewSummaryText;
    const orig = fullText
      ? `<details class="ai-orig"><summary>요약 전문 보기</summary><p>${esc(fullText)}</p><p class="ai-attr">Google 리뷰 요약을 한국어로 번역했어요${s.reviewSummaryFlagUri ? ` · <a href="${esc(s.reviewSummaryFlagUri)}" target="_blank" rel="noopener" class="ai-flag">신고</a>` : ''}</p></details>` : '';
    aiEl.querySelector('.ai-body').innerHTML =
      row('좋아요', 'pro', s.pros) + row('참고', 'con', s.cons) + row('추천 메뉴', 'menu', s.menus) + attr + orig;
  } else if (s?.status === 'NO_SOURCE') {
    aiEl.querySelector('.ai-body').innerHTML = `
      <p class="ai-muted">리뷰가 아직 적어서 AI 요약이 없어요</p>
      <a href="${esc(fallbackLink)}" class="btn-ghost" target="_blank" rel="noopener">구글 지도에서 리뷰 보기 ↗</a>`;
  } else {
    aiEl.querySelector('.ai-body').innerHTML = `
      <p class="ai-muted">지금은 AI 요약을 불러오지 못했어요</p>
      <div class="ai-actions">
        <button type="button" class="btn-ghost" data-ai-retry>다시 시도</button>
        <a href="${esc(fallbackLink)}" class="btn-ghost" target="_blank" rel="noopener">구글 지도에서 리뷰 보기 ↗</a>
      </div>`;
    aiEl.querySelector('[data-ai-retry]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.textContent = '불러오는 중…';
      btn.disabled = true;
      const retryS = MOCK ? await mockSummary()
        : await api(`/api/restaurants/${encodeURIComponent(placeId)}/summary?retry=true`, { auth: false }).catch(() => null);
      applySheetSummary(wrap, placeId, retryS, fallbackLink);
    });
  }
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
async function mockDetail() {
  await new Promise(r => setTimeout(r, 600));
  return { nameKo: '이치란 도톤보리점 본관', reviews: [] };
}
async function mockSummary() {
  await new Promise(r => setTimeout(r, 900));
  return {
    status: 'OK',
    pros: ['진한 돈코츠 국물', '1인석이라 혼밥 편함'],
    cons: ['저녁엔 대기 30분 이상'],
    menus: ['돈코츠 라멘', '카에다마'],
    fullKo: '손님들은 진한 돈코츠 육수와 칸막이가 있는 1인 좌석 구조를 높이 평가합니다. 매운맛과 면 익힘을 직접 선택할 수 있는 점도 인기 요소입니다. 저녁 시간대에는 대기가 30분을 넘는 경우도 있습니다.',
    reviewSummaryText: 'Diners praise the rich tonkotsu broth and the solo dining setup with privacy screens. The customizable spice level and noodle firmness are highlights. Evening waits can exceed 30 minutes.',
    reviewSummaryDisclosure: 'Gemini로 요약됨',
    reviewsUri: 'https://www.google.com/maps/place/ichiran+dotonbori',
    reviewSummaryFlagUri: 'https://www.google.com/local/content/rap/report',
  };
}
