// S-01 주변 놀거리: 우리 DB(spots) 목록 + 뽑기 + 상세 시트
// API: GET /api/spots?lat=&lng=&radiusKm=&kinds=  ·  GET /api/spots/{id}
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { icons, esc, dpRun, dpShow, dpMount, bindCard, TITLE_ICONS } from './icons.js';
import { regionKo } from './regions.js';
import { kindLabel, kindIcon, openSpotSheet } from './spotsheet.js';
import { saveButton, syncSave, spotKey } from './saved.js';

renderHeader();
document.querySelector('.draw-title')?.insertAdjacentHTML('afterbegin', `<span class="title-ic">${TITLE_ICONS.spot}</span>`);
document.getElementById('back-link').insertAdjacentHTML('afterbegin', icons.back());

const RADII = [5, 10, 30];
const qp = new URLSearchParams(location.search);
let radiusKm = RADII.includes(Number(qp.get('radiusKm'))) ? Number(qp.get('radiusKm')) : 10;
let kinds = ['ALL'];
let loc = null;
let seq = 0;
let lastList = [];
let allList = [];
let openOnly = false;
let lastData = null;
let dpSeen = [];

const listEl  = document.getElementById('list');
const countEl = document.getElementById('count');
const dpBtn   = document.getElementById('dp-draw-btn');
const dpResult = document.getElementById('dp-result');
const radiusButtons = document.querySelectorAll('[data-radius]');

// ---------- 조건 ----------
const kindGroup = document.querySelector('.chips[data-multi]');
kindGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-v]');
  if (!btn) return;
  const btns = [...kindGroup.querySelectorAll('button')];
  const all = btns.find(b => b.dataset.v === 'ALL');
  if (btn === all) {
    btns.forEach(b => b.setAttribute('aria-pressed', String(b === all)));
  } else {
    btn.setAttribute('aria-pressed', String(btn.getAttribute('aria-pressed') !== 'true'));
    const picked = btns.filter(b => b !== all && b.getAttribute('aria-pressed') === 'true');
    all.setAttribute('aria-pressed', String(picked.length === 0));
  }
  kinds = btns.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v);
  load();
});

function renderRadius() {
  radiusButtons.forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.radius) === radiusKm)));
}
radiusButtons.forEach(btn => btn.addEventListener('click', () => {
  radiusKm = Number(btn.dataset.radius);
  renderRadius();
  load();
}));
renderRadius();
document.getElementById('open-only').addEventListener('change', (e) => { openOnly = e.target.checked; render(); });

// 다른 화면에서 넘어온 경우: ?lat=&lng=&near=이름 → 그곳 기준으로 고정
function fixedFromQuery(q) {
  const la = Number(q.get('lat')), ln = Number(q.get('lng'));
  if (!(q.has('lat') && q.has('lng') && la > 20 && la < 46 && ln > 122 && ln < 154)) return null;
  return { lat: la, lng: ln, near: q.get('near') || '그곳' };
}

// ---------- 목록 ----------
// 종류별 한자 도장 (목록 왼쪽 칸)
const KIND_JA = { SHRINE_TEMPLE: '社', PARK_GARDEN: '園', HISTORIC: '城', MUSEUM: '館', VIEWPOINT: '景', MARKET: '市', AMUSEMENT: '遊', ONSEN: '湯' };

/** 목록 카드 한 줄. pick=true면 뽑기 결과용: 소개 두 줄을 더 보여 주고, 저장 버튼은 아래 버튼 줄에 */
function item(s, i, pick = false) {
  const open = s.openNow === true ? '<span class="sp-open on">영업 중</span>'
             : s.openNow === false ? '<span class="sp-open off">영업 전·종료</span>' : '';
  return `
    <div class="r-item sp-item" role="button" tabindex="0" ${pick ? 'data-dp-card' : `data-i="${i}"`} data-kind="${esc(s.kind || '')}">
      <span class="sp-kind" aria-hidden="true">
        <span class="sp-kind-ic">${kindIcon(s.kind)}</span>
        <span class="sp-kind-ja" lang="ja">${KIND_JA[s.kind] || '寄'}</span>
      </span>
      <span class="r-main">
        <span class="sp-top"><span class="sp-label">${esc(kindLabel(s.kind))}</span>${open}</span>
        <span class="r-title">${esc(s.name)}</span>
        ${s.nameJa ? `<span class="sp-ja" lang="ja">${esc(s.nameJa)}</span>` : ''}
        <span class="r-meta">
          <span class="sp-dist">${Number(s.distanceKm).toFixed(1)}km</span>
          <span class="sep">·</span><span>${esc(regionKo(s.prefecture, s.city))}</span>
          ${s.hoursLabel ? `<span class="sep">·</span><span>${esc(s.hoursLabel)}</span>` : ''}
        </span>
        ${pick && s.summary ? `<span class="dp-pick-sum">${esc(s.summary)}</span>` : ''}
      </span>
      ${pick ? '' : saveButton(spotKey(s.id), { type: 'SPOT', spotId: s.id }, 'mini')}
    </div>`;
}

async function load() {
  if (!loc) return;
  const mySeq = ++seq;
  countEl.textContent = '';
  listEl.innerHTML = '<div class="f-item skeleton-row" aria-hidden="true"></div>'.repeat(3);
  dpResult.hidden = true;
  dpSeen = [];

  const q = new URLSearchParams({ lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6), radiusKm });
  if (!kinds.includes('ALL')) q.set('kinds', kinds.join(','));

  let data;
  try {
    data = await api(`/api/spots?${q}`, { auth: false });
  } catch (e) {
    if (mySeq !== seq) return;
    listEl.innerHTML = `<div class="empty-state"><h2>잠깐 문제가 생겼어요</h2><p class="muted">${esc(e.message)}</p></div>`;
    return;
  }
  if (mySeq !== seq) return;
  lastData = data;
  allList = data.spots || [];
  render();
}

function render() {
  const data = lastData;
  if (!data) return;
  lastList = openOnly ? allList.filter(s => s.openNow === true) : allList;
  dpResult.hidden = true;
  dpSeen = [];

  if (openOnly && allList.length && !lastList.length) {
    countEl.textContent = '';
    listEl.innerHTML = `
      <div class="empty-state">
        <h2>지금 영업 중인 놀거리가 없어요</h2>
        <p class="muted">'영업 중인 곳만'을 끄거나 범위를 넓혀 보세요.</p>
      </div>`;
    return;
  }
  if (!lastList.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <h2>근처에 등록된 놀거리가 없어요</h2>
        <p class="muted">범위를 넓히거나 다른 도시로 바꿔 보세요.</p>
      </div>`;
    return;
  }
  countEl.textContent = (data.searchedRadiusKm > radiusKm ? `${radiusKm}km 안에 없어서 ${data.searchedRadiusKm}km까지 · ` : '')
    + `${lastList.length}곳${openOnly ? ' · 영업 중' : ''} · 가까운 순`;
  listEl.innerHTML = lastList.map(item).join('');
  syncSave(listEl);
}

listEl.addEventListener('click', (e) => {
  if (e.target.closest('.save-btn')) return;   // 저장 버튼은 상세를 열지 않음
  const el = e.target.closest('.r-item[data-i]');
  if (el) openSpotSheet(lastList[Number(el.dataset.i)]);
});
listEl.addEventListener('keydown', (e) => {
  if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.matches('.r-item[data-i]')) return;
  e.preventDefault();
  openSpotSheet(lastList[Number(e.target.dataset.i)]);
});

// ---------- 뽑기 ----------
dpBtn.addEventListener('click', () => drawOne());

let dpBusy = false;
async function drawOne() {
  if (dpBusy) return;
  const openList = lastList.filter(s => s.openNow === true);   // 뽑기는 지금 영업 중인 곳만
  if (!openList.length) {
    dpShow(dpResult, `<p class="muted dp-msg">${lastList.length ? '지금 영업 중인 놀거리가 없어요. 범위를 넓혀 보세요.' : '뽑을 놀거리가 없어요. 범위나 위치를 바꿔 보세요.'}</p>`, false);
    return;
  }
  let pool = openList.filter(s => !dpSeen.includes(s.id));
  if (!pool.length) { dpSeen = []; pool = openList; }
  const s = pool[Math.floor(Math.random() * pool.length)];
  dpSeen.push(s.id);

  dpBusy = true;
  dpBtn.disabled = true;
  dpBtn.textContent = '뽑는 중…';
  await dpRun(() => null);
  dpBusy = false;
  dpBtn.disabled = false;

  dpShow(dpResult, `
    <div class="dp-pick">
      ${item(s, -1, true)}
      <div class="dp-pick-actions">
        <button type="button" class="dp-main" data-dp-detail>자세히 보기</button>
        <a class="dp-ico" href="/restaurants.html?lat=${s.lat}&lng=${s.lng}&near=${encodeURIComponent(s.name)}" aria-label="근처 맛집" title="근처 맛집">${icons.fork('icon')}</a>
        <a class="dp-ico" href="/festivals.html?lat=${s.lat}&lng=${s.lng}&near=${encodeURIComponent(s.name)}" aria-label="근처 축제" title="근처 축제">${icons.lantern('icon')}</a>
        ${saveButton(spotKey(s.id), { type: 'SPOT', spotId: s.id }, 'ico')}
      </div>
    </div>`);
  dpBtn.textContent = '다시 뽑기';
  dpResult.querySelector('[data-dp-detail]').addEventListener('click', () => openSpotSheet(s));
  bindCard(dpResult, () => openSpotSheet(s));
  syncSave(dpResult);
}

const fixed = fixedFromQuery(qp);
if (fixed) {
  loc = { lat: fixed.lat, lng: fixed.lng };
  document.getElementById('search-bar').innerHTML = `
    <div class="near-pill">
      <span>📍 <b>${esc(fixed.near)}</b> 근처</span>
      <a href="/spots.html">내 위치로 보기</a>
    </div>`;
  load();
} else {
  mountSearchBar(document.getElementById('search-bar'), (state) => {
    loc = state.loc;
    load();
  }, { dates: false });
}

dpMount('spot');   // 뽑기 패널 3D 오미쿠지 통
