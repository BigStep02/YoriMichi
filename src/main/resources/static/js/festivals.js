// F-01 축제 목록
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { formatRange, dDayLabel, todayTokyo } from './dates.js';
import { regionKo } from './regions.js';
import { icons, esc } from './icons.js';

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
  syncUrl(state);
  const seq = ++requestSeq;
  skeleton();

  const q = new URLSearchParams({ lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6), radiusKm, from, to });
  try {
    const data = await api(`/api/festivals?${q}`);
    if (seq !== requestSeq) return;
    const list = data.festivals || [];

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
    resultsEl.querySelector('[data-retry]').addEventListener('click', () => load(bar.state));
  }
}

const bar = mountSearchBar(document.getElementById('search-bar'), load);
skeleton();
radiusButtons.forEach(btn => btn.addEventListener('click', () => {
  radiusKm = Number(btn.dataset.radius);
  renderRadius();
  bar.refresh();
}));
renderRadius();
