// 코스 뽑기: 조건 고르기 → 뽑는 중 → 코스 카드 결과
// API: GET /api/courses/draw?preset=SPOT_RESTAURANT|FESTIVAL_RESTAURANT
// ?mock=1 로 가짜 데이터, ?empty=1 로 빈 결과 테스트
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { icons, multiLanterns, esc } from './icons.js';
import { acquireStage, webglAvailable } from './hanabi/hanabi-stage.js';
import { enableHSwipe, enableGroupSwipe } from './swipe.js';
import { kindLabel, kindIcon, openSpotSheet } from './spotsheet.js';
import { openRestaurantSheet, typeChip, tabelogUrl } from './rsheet.js';

renderHeader();
document.getElementById('back-link').insertAdjacentHTML('afterbegin', icons.back());
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icons[el.dataset.icon]('icon icon-lg'); });

const params = new URLSearchParams(location.search);
const MOCK = params.get('mock') === '1';
const MIN_LOADING_MS = 1300;


const steps = {
  form:    document.getElementById('step-form'),
  loading: document.getElementById('step-loading'),
  result:  document.getElementById('step-result'),
};
const resultEl = steps.result;

const opts = {
  preset: 'SPOT_RESTAURANT',
  kinds: ['ALL'],
  radiusKm: '10',
  restaurantRadiusM: '800',
  maxPrice: '',
  openNow: true,
};
let loc = null;
let excluded = [];
let drawSeq = 0;

// ── 연등 로딩 일러스트 ──
document.querySelector('[data-illust]').innerHTML = multiLanterns();

// ── Hanabi stage ──
let stage = null;
let skipRequested = false;
let stageReleased = false;

const canvas  = document.getElementById('hanabi-stage');
const skipBtn = document.getElementById('hanabi-skip');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (webglAvailable()) {
  document.body.classList.add('hanabi');
  requestAnimationFrame(() => setTimeout(() => {
    try {
      stage = acquireStage(canvas, { scene: 'pond', calm });
      if (stage.firstVisit) stage.introGlyph('寄り道');
      stage.idle();
    } catch (_) { stage = null; }
  }, 0));
}

skipBtn.addEventListener('click', () => {
  if (!stage) return;
  if (stageReleased) { stage.release(); stage.skip(); }
  else skipRequested = true;
});

// ── 조건 이벤트 ──

// 프리셋 선택
document.getElementById('preset-group').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-v]');
  if (!btn) return;
  document.querySelectorAll('#preset-group [data-v]').forEach(b => b.setAttribute('aria-checked', String(b === btn)));
  opts.preset = btn.dataset.v;
  document.getElementById('kind-group').hidden = opts.preset !== 'SPOT_RESTAURANT';
  excluded = [];
  const sub = document.querySelector('[data-loading-sub]');
  sub.textContent = opts.preset === 'FESTIVAL_RESTAURANT'
    ? '근처 축제와 맛집을 연결하고 있어요'
    : '근처 명소와 맛집을 연결하고 있어요';
});

// 놀거리 종류 멀티셀렉트
const kindGroup = document.querySelector('.chips[data-multi]');
kindGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-v]');
  if (!btn) return;
  const btns = [...kindGroup.querySelectorAll('button')];
  const anyBtn = btns.find(b => b.dataset.v === 'ALL');
  if (btn === anyBtn) {
    btns.forEach(b => b.setAttribute('aria-pressed', String(b === anyBtn)));
  } else {
    btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
    const picked = btns.filter(b => b !== anyBtn && b.getAttribute('aria-pressed') === 'true');
    anyBtn.setAttribute('aria-pressed', String(picked.length === 0));
  }
  opts.kinds = btns.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v);
  excluded = [];
});

// 단일 선택 칩
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

enableGroupSwipe();

mountSearchBar(document.getElementById('search-bar'), (state) => {
  loc = state.loc;
  excluded = [];
}, { dates: false });

// ── 화면 전환 ──
function show(name) {
  Object.entries(steps).forEach(([k, el]) => { el.hidden = k !== name; });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelector('[data-draw]').addEventListener('click', () => draw());

function swipeToRedraw() {
  const card = resultEl.firstElementChild;
  if (!card) return;
  const fling = (dir) => () => card.animate(
    [{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${dir * 70}%) rotate(${dir * 5}deg)`, opacity: 0 }],
    { duration: 260, easing: 'ease-in', fill: 'forwards' }
  ).onfinish = () => draw();
  enableHSwipe(card, { follow: true, threshold: 70, onNext: fling(-1), onPrev: fling(1) });
}

// ── 뽑기 ──
async function draw() {
  if (!loc && !MOCK) return;
  const mySeq = ++drawSeq;
  skipRequested = false;
  stageReleased = false;

  const q = new URLSearchParams({
    lat:                (loc?.lat ?? 34.6937).toFixed(6),
    lng:                (loc?.lng ?? 135.5023).toFixed(6),
    radiusKm:           opts.radiusKm,
    restaurantRadiusM:  opts.restaurantRadiusM,
    preset:             opts.preset,
    openNow:            String(opts.openNow),
  });
  if (opts.maxPrice) q.set('maxPrice', opts.maxPrice);
  if (opts.preset === 'SPOT_RESTAURANT' && !opts.kinds.includes('ALL'))
    q.set('kinds', opts.kinds.join(','));
  if (excluded.length) q.set('exclude', excluded.join(','));

  if (stage) {
    document.body.classList.add('hanabi-playing');
    const burst = { data: null };

    stage.play({
      onSkippable: (on) => { skipBtn.hidden = !on; },
      flash: () => { window.gsap?.fromTo('#hanabi-flash', { opacity: .9 }, { opacity: 0, duration: .8 }); },
      onBurst: () => {
        if (mySeq !== drawSeq || !burst.data) return;
        document.body.classList.remove('hanabi-playing');
        skipBtn.hidden = true;
        renderResult(burst.data);
        resultEl.querySelector('.course-card')?.classList.add('reveal');
        show('result');
      },
    });

    let data, error;
    try {
      data = MOCK ? mockCourseDraw() : await api(`/api/courses/draw?${q}`, { auth: false });
    } catch (e) { error = e; }

    if (mySeq !== drawSeq) return;

    if (error) {
      stage.abort();
      document.body.classList.remove('hanabi-playing');
      skipBtn.hidden = true;
      renderError(error);
      return;
    }
    if (!hasResult(data)) {
      stage.abort();
      document.body.classList.remove('hanabi-playing');
      skipBtn.hidden = true;
      renderEmpty(data?.reason);
      return;
    }

    trackExcluded(data);
    burst.data = data;
    stageReleased = true;
    stage.release();
    if (skipRequested) { skipRequested = false; stage.skip(); }

  } else {
    show('loading');
    document.querySelector('[data-loading-sub]').textContent = opts.preset === 'FESTIVAL_RESTAURANT'
      ? '근처 축제와 맛집을 연결하고 있어요'
      : '근처 명소와 맛집을 연결하고 있어요';

    const started = Date.now();
    let data, error;
    try {
      data = MOCK ? mockCourseDraw() : await api(`/api/courses/draw?${q}`, { auth: false });
    } catch (e) { error = e; }
    const wait = MIN_LOADING_MS - (Date.now() - started);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    if (mySeq !== drawSeq) return;

    if (error) return renderError(error);
    if (!hasResult(data)) return renderEmpty(data?.reason);

    trackExcluded(data);
    renderResult(data);
    resultEl.querySelector('.course-card')?.classList.add('reveal');
    show('result');
  }
}

function hasResult(data) {
  return data?.restaurants?.length > 0 && (data.spot || data.festival);
}
function trackExcluded(data) {
  const pid = data.restaurants?.[0]?.placeId;
  if (pid) excluded.push(pid);
  if (excluded.length > 20) excluded = excluded.slice(-20);
}

// ── 거리 표시 ──
function distKmLabel(km) {
  const m = Math.round(km * 1000);
  const min = Math.max(1, Math.round(m / 80));
  return `도보 ${min}분 · ${m >= 1000 ? km.toFixed(1) + 'km' : m + 'm'}`;
}
function distMLabel(m) {
  const min = Math.max(1, Math.round(m / 80));
  return `도보 ${min}분 · ${m >= 1000 ? (m / 1000).toFixed(1) + 'km' : m + 'm'}`;
}
function priceLabel(level) {
  if (level == null) return '';
  return level === 0 ? '무료' : '¥'.repeat(level);
}
function dateRangeLabel(start, end) {
  if (!start || !end) return null;
  const s = new Date(start + 'T00:00:00'), e = new Date(end + 'T00:00:00');
  return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`;
}

// ── 결과 렌더링: 등불 2개를 縁の糸로 잇는 코스 카드 ──
function todayLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function renderResult(data) {
  const r = data.restaurants[0];
  const isSpot = data.preset !== 'FESTIVAL_RESTAURANT';
  const step1Html = isSpot ? renderSpotStep(data.spot) : renderFestivalStep(data.festival);

  const rTags = [
    typeChip(r, 'cx-chip'),
    r.rating != null ? `<span class="cx-chip star">★ ${r.rating.toFixed(1)} <small>(${r.ratingCount.toLocaleString()})</small></span>` : '',
    r.priceLevel ? `<span class="cx-chip">${priceLabel(r.priceLevel)}</span>` : '',
    r.openNow ? '<span class="cx-chip open">영업 중</span>' : '',
  ].filter(Boolean).join('');

  const pool = isSpot && data.spotDbCount
    ? `<span>근처 놀거리 <b>${data.spotDbCount}곳</b> 중에서 엮음${data.spotSupplemented ? ' · 구글 지도 보충' : ''}</span>` : '<span>우연으로 엮은 코스</span>';

  resultEl.innerHTML = `
    <article class="cx" style="--cx-accent:${isSpot ? '#7FE0C0' : '#F2C14E'}">
      <header class="cx-head">
        <span class="cx-seal" lang="ja">縁</span>
        <div class="cx-head-t">
          <span class="cx-kicker" lang="ja">今日の縁 · ${todayLabel()}</span>
          <b>오늘의 코스</b>
        </div>
        <span class="cx-count">2 STOPS</span>
      </header>

      <ol class="cx-steps">
        ${step1Html}
        <li class="cx-thread" aria-hidden="true">
          <span class="cx-thread-line"></span>
          <span class="cx-thread-label">${icons.route('icon')} ${distMLabel(r.distanceM)}</span>
        </li>
        <li class="cx-step">
          <span class="cx-node rest"><span lang="ja">弐</span></span>
          <div class="cx-body">
            <span class="cx-label">근처 맛집</span>
            <h2 class="cx-name" lang="ja">${esc(r.name)}</h2>
            <div class="cx-chips">${rTags}</div>
            <div class="cx-actions">
              <button type="button" class="dp-main" data-r-detail>가게 공개 · AI 요약</button>
              ${r.googleMapsUri ? `<a class="dp-ico" href="${esc(r.googleMapsUri)}" target="_blank" rel="noopener" aria-label="구글 지도" title="구글 지도">${icons.map('icon')}</a>` : ''}
              <a class="dp-ico cx-tabelog" href="${tabelogUrl(r.name)}" target="_blank" rel="noopener" aria-label="食べログ" title="食べログ" lang="ja">食</a>
            </div>
          </div>
        </li>
      </ol>

      <footer class="cx-foot">${pool}</footer>
    </article>
    <div class="cx-bottom">
      <button type="button" class="cx-btn ghost" data-swap>${icons.dice('icon')} 맛집만 바꾸기</button>
      <button type="button" class="cx-btn" data-redraw>${icons.route('icon')} 다시 엮기</button>
    </div>
    <button type="button" class="text-btn" data-change>조건 바꾸기</button>
    <p class="attribution">가게 정보: Google 지도</p>`;

  resultEl.querySelector('[data-swap]').addEventListener('click', () => {
    const pid = r.placeId;
    if (pid && !excluded.includes(pid)) excluded.push(pid);
    draw();
  });
  resultEl.querySelector('[data-redraw]').addEventListener('click', () => draw());
  resultEl.querySelector('[data-r-detail]').addEventListener('click', () => openRestaurantSheet(r));
  resultEl.querySelector('[data-spot-detail]')?.addEventListener('click', () => openSpotSheet(data.spot));
  swipeToRedraw();
  resultEl.querySelector('[data-change]').addEventListener('click', () => {
    if (stage) stage.idle();
    show('form');
  });
}

function renderSpotStep(spot) {
  const chips = [
    `<span class="cx-chip">${kindIcon(spot.kind)} ${esc(kindLabel(spot.kind))}</span>`,
    `<span class="cx-chip">${distKmLabel(spot.distanceKm)}</span>`,
    spot.openNow === true ? '<span class="cx-chip open">영업 중</span>' : '',
    spot.hoursLabel ? `<span class="cx-chip">${esc(spot.hoursLabel)}</span>` : '',
  ].filter(Boolean).join('');

  const main = spot.fromPlaces
    ? (spot.googleMapsUri ? `<a class="dp-main" href="${esc(spot.googleMapsUri)}" target="_blank" rel="noopener">구글 지도에서 보기</a>` : '')
    : '<button type="button" class="dp-main" data-spot-detail>운영시간·요금 보기</button>';
  const side = !spot.fromPlaces && spot.officialUrl
    ? `<a class="dp-ico" href="${esc(spot.officialUrl)}" target="_blank" rel="noopener" aria-label="공식 사이트" title="공식 사이트">↗</a>` : '';

  return `
    <li class="cx-step">
      <span class="cx-node spot"><span lang="ja">壱</span></span>
      <div class="cx-body">
        <span class="cx-label">명소</span>
        <h2 class="cx-name">${esc(spot.name)}</h2>
        ${spot.nameJa ? `<p class="cx-ja" lang="ja">${esc(spot.nameJa)}</p>` : ''}
        <div class="cx-chips">${chips}</div>
        ${spot.summary ? `<p class="cx-desc">${esc(spot.summary)}</p>` : ''}
        <div class="cx-actions">${main}${side}</div>
      </div>
    </li>`;
}

function renderFestivalStep(fest) {
  const dateLabel = dateRangeLabel(fest.startDate, fest.endDate);
  const chips = [
    '<span class="cx-chip">🏮 축제</span>',
    `<span class="cx-chip">${distKmLabel(fest.distanceKm)}</span>`,
    fest.ongoing ? '<span class="cx-chip open">진행 중</span>' : '',
    dateLabel ? `<span class="cx-chip">${esc(dateLabel)}</span>` : '',
  ].filter(Boolean).join('');

  return `
    <li class="cx-step">
      <span class="cx-node fest"><span lang="ja">壱</span></span>
      <div class="cx-body">
        <span class="cx-label">축제</span>
        <h2 class="cx-name">${esc(fest.name)}</h2>
        ${fest.nameJa ? `<p class="cx-ja" lang="ja">${esc(fest.nameJa)}</p>` : ''}
        <div class="cx-chips">${chips}</div>
        ${fest.summary ? `<p class="cx-desc">${esc(fest.summary)}</p>` : ''}
        <div class="cx-actions">
          <a class="dp-main" href="/festival.html?id=${encodeURIComponent(fest.id)}">축제 자세히 보기</a>
          ${fest.officialUrl ? `<a class="dp-ico" href="${esc(fest.officialUrl)}" target="_blank" rel="noopener" aria-label="공식 사이트" title="공식 사이트">↗</a>` : ''}
        </div>
      </div>
    </li>`;
}

function renderEmpty(reason) {
  const msgMap = {
    NO_SPOT:       '지금 문을 연 명소가 근처에 없어요.',
    NO_FESTIVAL:   '이 기간 근처에 열리는 축제가 없어요.',
    NO_RESTAURANT: '명소 주변에서 맛집을 찾지 못했어요.',
  };
  const msg = msgMap[reason] ?? '조건에 맞는 코스가 없어요.';

  let widerBtn = '';
  if (reason === 'NO_RESTAURANT') {
    if (opts.restaurantRadiusM !== '1500') {
      widerBtn = '<button type="button" class="btn-primary" data-wider>맛집 반경 넓혀서 다시 뽑기</button>';
    }
  } else {
    if (opts.radiusKm !== '20') {
      widerBtn = '<button type="button" class="btn-primary" data-wider>범위 넓혀서 다시 뽑기</button>';
    }
  }

  resultEl.innerHTML = `
    <div class="empty-state">
      <div class="multi-swing small">${multiLanterns()}</div>
      <h2>코스를 엮지 못했어요</h2>
      <p class="muted">${msg}<br>거리를 넓히거나 조건을 바꿔 보세요.</p>
      <div class="r-actions">
        ${widerBtn}
        <button type="button" class="btn-ghost" data-change>조건 바꾸기</button>
      </div>
    </div>`;
  resultEl.querySelector('[data-wider]')?.addEventListener('click', () => {
    if (reason === 'NO_RESTAURANT') {
      const next = opts.restaurantRadiusM === '400' ? '800' : '1500';
      document.querySelector(`[data-opt="restaurantRadiusM"] button[data-v="${next}"]`).click();
    } else {
      const next = opts.radiusKm === '5' ? '10' : '20';
      document.querySelector(`[data-opt="radiusKm"] button[data-v="${next}"]`).click();
    }
    draw();
  });
  resultEl.querySelector('[data-change]').addEventListener('click', () => {
    if (stage) stage.idle();
    show('form');
  });
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
  resultEl.querySelector('[data-change]').addEventListener('click', () => {
    if (stage) stage.idle();
    show('form');
  });
  show('result');
}

// ── 가짜 데이터 (?mock=1) ──
function mockCourseDraw() {
  if (params.get('empty') === '1') {
    return { preset: opts.preset, spot: null, festival: null, restaurants: [], cafe: null, spotDbCount: 0, spotSupplemented: false, restaurantRadiusM: +opts.restaurantRadiusM, reason: 'NO_SPOT' };
  }
  const spots = [
    { id: 1, placeId: 'mock-fushimi', name: '伏見稲荷大社', nameJa: '伏見稲荷大社', kind: 'SHRINE_TEMPLE', prefecture: '京都府', city: '京都市', distanceKm: 1.2, lat: 34.967, lng: 135.773, openNow: true, hoursLabel: '24시간', summary: '일본 전국 약 3만 사를 거느리는 이나리 신사의 총본사. 붉은 도리이가 산길을 따라 이어집니다.', officialUrl: null, googleMapsUri: null, fromPlaces: false },
    { id: 2, placeId: 'mock-nijo',    name: '二条城',         nameJa: '二条城',         kind: 'HISTORIC',      prefecture: '京都府', city: '京都市', distanceKm: 2.1, lat: 35.014, lng: 135.748, openNow: true, hoursLabel: '8:45–17:00',   summary: '에도 막부의 쇼군이 교토에 머물던 이중 해자를 갖춘 성. 세계문화유산.',                              officialUrl: null, googleMapsUri: null, fromPlaces: false },
  ];
  const restaurants = [
    { placeId: 'mock-soba-1', name: 'かわいそば',      typeLabel: 'そば',     rating: 4.1, ratingCount: 2300, score: 4.09, priceLevel: 1, openNow: true,  distanceM: 230, lat: 34.966, lng: 135.771, googleMapsUri: 'https://www.google.com/maps' },
    { placeId: 'mock-ramen-1', name: '麺屋 あかつき',   typeLabel: 'ラーメン', rating: 4.3, ratingCount: 1890, score: 4.28, priceLevel: 1, openNow: true,  distanceM: 450, lat: 34.969, lng: 135.775, googleMapsUri: 'https://www.google.com/maps' },
    { placeId: 'mock-izakaya-1', name: '三条 はなれ',  typeLabel: '居酒屋',  rating: 3.9, ratingCount: 820,  score: 3.88, priceLevel: 2, openNow: false, distanceM: 680, lat: 34.965, lng: 135.770, googleMapsUri: 'https://www.google.com/maps' },
  ];
  const festival = {
    id: 1, name: '伏見稲荷もみじまつり', nameJa: '伏見稲荷もみじまつり',
    prefecture: '京都府', city: '京都市',
    startDate: '2026-11-15', endDate: '2026-11-30',
    dDay: 0, ongoing: true,
    distanceKm: 1.5, lat: 34.967, lng: 135.773,
    summary: '단풍이 절정인 11월, 도리이 길에 등불이 켜지고 전통 가무 공연이 펼쳐져요.',
    officialUrl: null,
  };

  const spot = spots.find(s => !excluded.includes(s.placeId)) ?? spots[0];
  const rest = restaurants.find(r => !excluded.includes(r.placeId)) ?? null;

  if (opts.preset === 'FESTIVAL_RESTAURANT') {
    return { preset: 'FESTIVAL_RESTAURANT', spot: null, festival, restaurants: rest ? [rest] : [], cafe: null, spotDbCount: 0, spotSupplemented: false, restaurantRadiusM: +opts.restaurantRadiusM, reason: rest ? null : 'NO_RESTAURANT' };
  }
  return { preset: 'SPOT_RESTAURANT', spot, festival: null, restaurants: rest ? [rest] : [], cafe: null, spotDbCount: spots.length, spotSupplemented: false, restaurantRadiusM: +opts.restaurantRadiusM, reason: rest ? null : 'NO_RESTAURANT' };
}