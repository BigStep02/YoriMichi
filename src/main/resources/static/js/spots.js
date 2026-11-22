// S-01 주변 놀거리: 우리 DB(spots) 목록 + 뽑기 + 상세 시트
// API: GET /api/spots?lat=&lng=&radiusKm=&kinds=  ·  GET /api/spots/{id}
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { icons, esc, dpLight } from './icons.js';
import { regionKo } from './regions.js';
import { kindLabel, kindIcon, openSpotSheet } from './spotsheet.js';

renderHeader();
document.getElementById('back-link').insertAdjacentHTML('afterbegin', icons.back());

const RADII = [5, 10, 30];
const qp = new URLSearchParams(location.search);
let radiusKm = RADII.includes(Number(qp.get('radiusKm'))) ? Number(qp.get('radiusKm')) : 10;
let kinds = ['ALL'];
let loc = null;
let seq = 0;
let lastList = [];
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

// ---------- 목록 ----------
function item(s, i) {
  const open = s.openNow === true ? '<span class="open-dot">영업 중</span>'
             : s.openNow === false ? '<span class="muted">영업 전·종료</span>' : '';
  return `
    <button type="button" class="r-item" data-i="${i}">
      <span class="r-rank" aria-hidden="true">${kindIcon(s.kind)}</span>
      <span class="r-main">
        <span class="r-title">${esc(s.name)}</span>
        <span class="r-sub">
          <span>${esc(kindLabel(s.kind))}</span>
          ${s.nameJa ? `<span lang="ja" class="muted">${esc(s.nameJa)}</span>` : ''}
        </span>
        <span class="r-meta">
          <span>${Number(s.distanceKm).toFixed(1)}km</span>
          <span class="sep">·</span><span>${esc(regionKo(s.prefecture, s.city))}</span>
          ${s.hoursLabel ? `<span class="sep">·</span><span>${esc(s.hoursLabel)}</span>` : ''}
          ${open ? `<span class="sep">·</span>${open}` : ''}
        </span>
      </span>
      ${icons.chevronRight('icon r-chev')}
    </button>`;
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
  lastList = data.spots || [];

  if (!lastList.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <h2>근처에 등록된 놀거리가 없어요</h2>
        <p class="muted">범위를 넓히거나 다른 도시로 바꿔 보세요.</p>
      </div>`;
    return;
  }
  countEl.textContent = (data.searchedRadiusKm > radiusKm ? `${radiusKm}km 안에 없어서 ${data.searchedRadiusKm}km까지 · ` : '')
    + `${lastList.length}곳 · 가까운 순`;
  listEl.innerHTML = lastList.map(item).join('');
}

listEl.addEventListener('click', (e) => {
  const el = e.target.closest('.r-item[data-i]');
  if (el) openSpotSheet(lastList[Number(el.dataset.i)]);
});

// ---------- 뽑기 ----------
dpBtn.addEventListener('click', () => drawOne());

function drawOne() {
  if (!lastList.length) {
    dpResult.innerHTML = '<p class="muted dp-msg">뽑을 놀거리가 없어요. 범위나 위치를 바꿔 보세요.</p>';
    dpResult.hidden = false;
    return;
  }
  let pool = lastList.filter(s => !dpSeen.includes(s.id));
  if (!pool.length) { dpSeen = []; pool = lastList; }
  const s = pool[Math.floor(Math.random() * pool.length)];
  dpSeen.push(s.id);

  dpResult.innerHTML = `
    <div class="dp-pick">
      <div class="dp-pick-top">
        <span class="dp-seal" lang="ja">縁</span>
        <span class="type-chip">${kindIcon(s.kind)} ${esc(kindLabel(s.kind))}</span>
        ${s.openNow ? '<span class="open-badge">영업 중</span>' : ''}
      </div>
      <div class="dp-pick-name">${esc(s.name)}</div>
      ${s.nameJa ? `<div class="dp-pick-ja" lang="ja">${esc(s.nameJa)}</div>` : ''}
      <div class="dp-pick-meta">
        <span>${Number(s.distanceKm).toFixed(1)}km</span>
        ${s.hoursLabel ? `<span>${esc(s.hoursLabel)}</span>` : ''}
      </div>
      ${s.summary ? `<p class="dp-pick-sum">${esc(s.summary)}</p>` : ''}
      <div class="dp-pick-actions">
        <button type="button" class="dp-main" data-dp-detail>자세히 보기</button>
        <a class="dp-ico" href="/restaurants.html?lat=${s.lat}&lng=${s.lng}&near=${encodeURIComponent(s.name)}" aria-label="근처 맛집" title="근처 맛집">${icons.fork('icon')}</a>
        <button type="button" class="dp-ico" data-dp-swap aria-label="다시 뽑기" title="다시 뽑기">${icons.dice('icon')}</button>
      </div>
    </div>`;
  dpResult.hidden = false;
  dpLight();
  dpResult.querySelector('[data-dp-detail]').addEventListener('click', () => openSpotSheet(s));
  dpResult.querySelector('[data-dp-swap]').addEventListener('click', () => drawOne());
}

mountSearchBar(document.getElementById('search-bar'), (state) => {
  loc = state.loc;
  load();
}, { dates: false });
