// 오늘의 우연 뽑기: 조건 고르기 → 뽑는 중 → 결과
// API: GET /api/restaurants/draw, GET /api/restaurants/{placeId}
// 백엔드가 아직 없을 때는 주소에 ?mock=1 을 붙이면 가짜 데이터로 화면을 볼 수 있음
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { icons, esc } from './icons.js';

renderHeader();
document.getElementById('back-link').insertAdjacentHTML('afterbegin', icons.back());
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icons[el.dataset.icon]('icon icon-lg'); });

const params = new URLSearchParams(location.search);
const MOCK = params.get('mock') === '1';
const MIN_LOADING_MS = 1300; // 너무 빨리 끝나면 "뽑는" 느낌이 안 나서 최소 시간 유지

const steps = {
  form: document.getElementById('step-form'),
  loading: document.getElementById('step-loading'),
  result: document.getElementById('step-result'),
};
const resultEl = steps.result;

const opts = { category: ['ALL'], radiusM: '800', maxPrice: '', openNow: true };
let loc = null;
let excluded = []; // 이번 조건에서 이미 뽑힌 곳 (다시 뽑기용)
let drawSeq = 0;

// ---------- 조건 ----------
// 종류: 여러 개 선택. '아무거나'는 단독, 다 끄면 '아무거나'로 돌아감
const catGroup = document.querySelector('.chips[data-multi]');
catGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-v]');
  if (!btn) return;
  const btns = [...catGroup.querySelectorAll('button')];
  const anyBtn = btns.find(b => b.dataset.v === 'ALL');
  if (btn === anyBtn) {
    btns.forEach(b => b.setAttribute('aria-pressed', String(b === anyBtn)));
  } else {
    btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
    const picked = btns.filter(b => b !== anyBtn && b.getAttribute('aria-pressed') === 'true');
    anyBtn.setAttribute('aria-pressed', String(picked.length === 0));
  }
  opts.category = btns.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v);
  excluded = [];
});

document.querySelectorAll('.chips[data-opt]:not([data-multi])').forEach(group => {
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-v]');
    if (!btn) return;
    group.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b === btn)));
    opts[group.dataset.opt] = btn.dataset.v;
    excluded = [];
  });
});
document.querySelector('[data-opt="openNow"]').addEventListener('change', (e) => {
  opts.openNow = e.target.checked;
  excluded = [];
});

mountSearchBar(document.getElementById('search-bar'), (state) => {
  loc = state.loc;
  excluded = [];
}, { dates: false });

// ---------- 화면 전환 ----------
function show(name) {
  Object.entries(steps).forEach(([k, el]) => { el.hidden = k !== name; });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelector('[data-illust]').innerHTML = swingingLanterns();
document.querySelector('[data-draw]').addEventListener('click', () => draw());

// ---------- 뽑기 ----------
async function draw() {
  if (!loc && !MOCK) return;
  const mySeq = ++drawSeq;
  show('loading');
  const sub = document.querySelector('[data-loading-sub]');
  sub.textContent = '평점과 리뷰 수를 함께 보고 있어요';

  const q = new URLSearchParams({
    lat: (loc?.lat ?? 34.6687).toFixed(6),
    lng: (loc?.lng ?? 135.5013).toFixed(6),
    radiusM: opts.radiusM,
    category: opts.category.join(','),
    openNow: String(opts.openNow),
  });
  if (opts.maxPrice) q.set('maxPrice', opts.maxPrice);
  if (excluded.length) q.set('exclude', excluded.join(','));

  const started = Date.now();
  let data, error;
  try {
    data = MOCK ? mockDraw() : await api(`/api/restaurants/draw?${q}`, { auth: false });
  } catch (e) {
    error = e;
  }
  const wait = MIN_LOADING_MS - (Date.now() - started);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (mySeq !== drawSeq) return;

  if (error) return renderError(error);
  if (!data?.pick) return renderEmpty();

  excluded.push(data.pick.placeId);
  if (excluded.length > 20) excluded = excluded.slice(-20);
  const detailPromise = loadDetailData(data.pick); // 힌트 보는 동안 미리 불러둠
  const summaryPromise = detailPromise.then(() => loadSummaryData(data.pick));
  renderHint(data, () => {
    renderResult(data);
    resultEl.querySelector('.result-card').classList.add('reveal');
    applyDetail(data.pick, mySeq, detailPromise);
    applySummary(data.pick, mySeq, summaryPromise);
  });
  show('result');
}

// ---------- 미리보기 (가게 이름 대신 조건만 먼저) ----------
function hintLantern() {
  return `<svg viewBox="0 0 40 56" width="40" height="56"><rect x="12" y="0" width="16" height="5" rx="2" fill="#1E2A4A"/><ellipse cx="20" cy="27" rx="17" ry="20" fill="#FAF8F5"/><path d="M4 20h32M3 27h34M4 34h32" stroke="#F2765C" stroke-width="1.6"/><rect x="12" y="46" width="16" height="5" rx="2" fill="#1E2A4A"/><line x1="20" y1="51" x2="20" y2="56" stroke="#1E2A4A" stroke-width="2"/></svg>`;
}
function renderHint(data, onReveal) {
  const p = data.pick;
  const clues = [
    p.typeLabel ? { k: '장르', v: `<span lang="ja">${esc(p.typeLabel)}</span>` } : null,
    { k: '거리', v: walkLabel(p.distanceM) },
    p.priceLevel != null ? { k: '가격대', v: priceLabel(p.priceLevel) } : null,
    p.rating != null ? { k: '평점', v: `<span class="star">★ ${p.rating.toFixed(1)}</span> <span class="muted">· 리뷰 ${p.ratingCount.toLocaleString()}개</span>` } : null,
  ].filter(Boolean);

  resultEl.innerHTML = `
    <p class="result-kicker">오늘의 우연</p>
    <article class="hint-card">
      <div class="hint-seal" aria-hidden="true">${hintLantern()}</div>
      <h2 class="hint-title">오늘의 한 끼가 정해졌어요</h2>
      <p class="muted hint-sub">근처 ${data.candidateCount}곳 중 보정 평점 상위 ${data.poolCount}곳에서 골랐어요. 조건이 마음에 들면 열어보세요</p>
      <dl class="clues">
        ${clues.map((c, i) => `<div class="clue" style="animation-delay:${0.15 + i * 0.18}s"><dt>${c.k}</dt><dd>${c.v}</dd></div>`).join('')}
      </dl>
    </article>
    <div class="r-actions">
      <button type="button" class="btn-primary" data-reveal>열어보기</button>
      <button type="button" class="btn-ghost" data-redraw>${icons.dice('icon')} 별로예요, 다시 뽑기</button>
    </div>
    <button type="button" class="text-btn" data-change>조건 바꾸기</button>`;

  resultEl.querySelector('[data-reveal]').addEventListener('click', () => {
    onReveal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  resultEl.querySelector('[data-redraw]').addEventListener('click', () => draw());
  resultEl.querySelector('[data-change]').addEventListener('click', () => show('form'));
}

// ---------- 결과 ----------
function priceLabel(level) {
  if (level == null) return '';
  return level === 0 ? '무료' : '¥'.repeat(level);
}
function walkLabel(m) {
  const min = Math.max(1, Math.round(m / 80)); // 도보 분속 80m
  return `도보 ${min}분 · ${m >= 1000 ? (m / 1000).toFixed(1) + 'km' : m + 'm'}`;
}

function renderResult(data) {
  const p = data.pick;
  const stats = [
    p.rating != null ? `<span class="star">★ ${p.rating.toFixed(1)}</span> <span class="muted">(${p.ratingCount.toLocaleString()})</span>` : '',
    walkLabel(p.distanceM),
    priceLabel(p.priceLevel),
  ].filter(Boolean).join('<span class="dot">·</span>');

  resultEl.innerHTML = `
    <p class="result-kicker">오늘의 우연은 여기</p>
    <article class="result-card">
      <div class="result-top">
        ${p.typeLabel ? `<span class="type-chip" lang="ja">${esc(p.typeLabel)}</span>` : ''}
        ${p.openNow ? '<span class="open-badge">영업 중</span>' : ''}
      </div>
      <h2 class="r-name" lang="ja">${esc(p.name)}</h2>
      <p class="r-name-ko" data-name-ko></p>
      <div class="r-stats">${stats}</div>
      <p class="why">${icons.dice('icon')} 근처 ${data.candidateCount}곳 중 보정 평점 상위 ${data.poolCount}곳에서 무작위로 골랐어요</p>

      <section class="ai-box" data-ai>
        <div class="ai-head">리뷰 한눈에 <span class="ai-tag">AI 요약</span></div>
        <div class="ai-body"><div class="sk-line"></div><div class="sk-line short"></div></div>
      </section>

      <section class="reviews" data-reviews></section>
    </article>

    <div class="r-actions">
      <a class="btn-primary" href="${esc(p.googleMapsUri)}" target="_blank" rel="noopener">${icons.map('icon')} 구글 지도에서 길찾기</a>
      <a class="btn-sub" href="https://tabelog.com/rstLst/?vs=1&sk=${encodeURIComponent(p.name)}&sw=${encodeURIComponent(p.name)}" target="_blank" rel="noopener"><span lang="ja">食べログ</span>에서 보기 ↗</a>
      <button type="button" class="btn-ghost" data-redraw>${icons.dice('icon')} 다시 뽑기</button>
    </div>
    <button type="button" class="text-btn" data-change>조건 바꾸기</button>
    <p class="attribution">가게 정보·리뷰: Google 지도 · 리뷰 요약은 AI가 만든 참고용이에요</p>`;

  resultEl.querySelector('[data-redraw]').addEventListener('click', () => draw());
  resultEl.querySelector('[data-change]').addEventListener('click', () => show('form'));
}

async function loadDetailData(pick) {
  try {
    return MOCK ? await mockDetail() : await api(`/api/restaurants/${encodeURIComponent(pick.placeId)}`, { auth: false });
  } catch {
    return null;
  }
}

async function loadSummaryData(pick, retry = false) {
  const url = `/api/restaurants/${encodeURIComponent(pick.placeId)}/summary${retry ? '?retry=true' : ''}`;
  try {
    return MOCK ? await mockSummary() : await api(url, { auth: false });
  } catch {
    return null;
  }
}

async function applyDetail(pick, mySeq, detailPromise) {
  const d = await detailPromise;
  if (mySeq !== drawSeq) return;

  if (d?.nameKo && d.nameKo !== pick.name) {
    const nameKoEl = resultEl.querySelector('[data-name-ko]');
    if (nameKoEl) nameKoEl.textContent = d.nameKo;
  }

  const reviews = (d?.reviews || []).slice(0, 2);
  const rEl = resultEl.querySelector('[data-reviews]');
  if (!rEl) return;
  rEl.innerHTML = reviews.length ? `
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
}

async function applySummary(pick, mySeq, summaryPromise) {
  const s = await summaryPromise;
  if (mySeq !== drawSeq) return;

  const aiEl = resultEl.querySelector('[data-ai]');
  if (!aiEl) return;

  const fallbackLink = s?.reviewsUri || pick.googleMapsUri;

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
    aiEl.querySelector('[data-ai-retry]').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      btn.textContent = '불러오는 중…';
      btn.disabled = true;
      applySummary(pick, mySeq, loadSummaryData(pick, true));
    });
  }
}

function renderEmpty() {
  resultEl.innerHTML = `
    <div class="empty-state">
      <div class="swing small">${swingingLanterns()}</div>
      <h2>조건에 맞는 곳이 없어요</h2>
      <p class="muted">${excluded.length ? '이 근처는 다 뽑아 봤어요. ' : ''}거리를 넓히거나 조건을 바꿔 보세요.</p>
      <div class="r-actions">
        ${opts.radiusM !== '1500' ? '<button type="button" class="btn-primary" data-wider>거리 넓혀서 다시 뽑기</button>' : ''}
        <button type="button" class="btn-ghost" data-change>조건 바꾸기</button>
      </div>
    </div>`;
  resultEl.querySelector('[data-wider]')?.addEventListener('click', () => {
    const next = opts.radiusM === '400' ? '800' : '1500';
    document.querySelector(`[data-opt="radiusM"] button[data-v="${next}"]`).click();
    draw();
  });
  resultEl.querySelector('[data-change]').addEventListener('click', () => show('form'));
  show('result');
}

function renderError(e) {
  resultEl.innerHTML = `
    <div class="empty-state">
      <h2>잠깐 문제가 생겼어요</h2>
      <p class="muted">${esc(e.message)}</p>
      <div class="r-actions">
        <button type="button" class="btn-primary" data-retry>다시 시도</button>
        <button type="button" class="btn-ghost" data-change>조건 바꾸기</button>
      </div>
    </div>`;
  resultEl.querySelector('[data-retry]').addEventListener('click', () => draw());
  resultEl.querySelector('[data-change]').addEventListener('click', () => show('form'));
  show('result');
}

function swingingLanterns() {
  const lamp = (x, delay, s = 1) => `
    <g class="lamp" style="animation-delay:${delay}s" transform="translate(${x} 18)">
      <g transform="scale(${s})">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#1E2A4A" stroke-width="1.5"/>
        <rect x="-8" y="8" width="16" height="4" rx="1.5" fill="#1E2A4A"/>
        <ellipse cx="0" cy="28" rx="15" ry="17" fill="#F2765C"/>
        <path d="M-14 22h28M-15 28h30M-14 34h28" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"/>
        <rect x="-8" y="44" width="16" height="4" rx="1.5" fill="#1E2A4A"/>
      </g>
    </g>`;
  return `<svg viewBox="0 0 200 90" aria-hidden="true">
    <path d="M0 14 Q100 34 200 14" stroke="#1E2A4A" stroke-width="1.5" fill="none"/>
    ${lamp(45, 0, 0.9)}${lamp(100, 0.25)}${lamp(155, 0.5, 0.9)}
  </svg>`;
}

// ---------- 가짜 데이터 (?mock=1) ----------
function mockDraw() {
  const list = [
    { placeId: 'mock-ichiran', name: '一蘭 道頓堀店本館', typeLabel: 'ラーメン屋', rating: 4.3, ratingCount: 9489, score: 4.28, priceLevel: 2, openNow: true, distanceM: 340, googleMapsUri: 'https://maps.google.com' },
    { placeId: 'mock-tsuru', name: 'つるとんたん 宗右衛門町店', typeLabel: 'うどん屋', rating: 4.0, ratingCount: 4987, score: 3.99, priceLevel: 2, openNow: true, distanceM: 520, googleMapsUri: 'https://maps.google.com' },
    { placeId: 'mock-kushi', name: '串かつ だるま 道頓堀店', typeLabel: '串揚げ店', rating: 4.1, ratingCount: 3120, score: 4.08, priceLevel: 1, openNow: true, distanceM: 210, googleMapsUri: 'https://maps.google.com' },
  ].filter(x => !excluded.includes(x.placeId));
  if (params.get('empty') === '1' || !list.length) return { pick: null, reason: 'NO_CANDIDATES' };
  return { pick: list[0], candidateCount: 18, poolCount: 7, avgRating: 3.92, radiusM: +opts.radiusM, category: opts.category, cached: false };
}
async function mockDetail() {
  await new Promise(r => setTimeout(r, 700));
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
