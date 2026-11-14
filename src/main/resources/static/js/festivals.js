// F-01 축제 목록
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { formatRange, dDayLabel } from './dates.js';
import { icons, esc } from './icons.js';

renderHeader();
document.getElementById('back-link').insertAdjacentHTML('afterbegin', icons.back());

const RADII = [10, 30, 50];
const params = new URLSearchParams(location.search);
let radiusKm = RADII.includes(Number(params.get('radiusKm'))) ? Number(params.get('radiusKm')) : 30;

const noticeEl = document.getElementById('notice');
const resultsEl = document.getElementById('results');
const radiusButtons = document.querySelectorAll('[data-radius]');

let requestSeq = 0;

function renderRadius() {
  radiusButtons.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.radius) === radiusKm)));
}

function notice(html, type = '') {
  noticeEl.innerHTML = `<div class="notice ${type}">${icons.info()}<div>${html}</div></div>`;
}

function skeleton() {
  noticeEl.innerHTML = '';
  resultsEl.innerHTML = Array.from({ length: 3 }, () => `
    <div class="skeleton" aria-hidden="true">
      <div class="bar" style="width:60%"></div>
      <div class="bar" style="width:35%"></div>
      <div class="bar" style="width:90%"></div>
    </div>`).join('');
}

function card(f, withYear = false) {
  const ended = !f.ongoing && f.dDay < 0;
  return `
    <a class="card f-card" href="/festival.html?id=${encodeURIComponent(f.id)}">
      <div class="top">
        <div>
          <h2 class="name">${esc(f.name)}</h2>
          ${f.nameJa ? `<p class="name-ja" lang="ja">${esc(f.nameJa)}</p>` : ''}
        </div>
        <span class="badge${ended ? ' ended' : ''}">${dDayLabel(f.dDay, f.ongoing)}</span>
      </div>
      <div class="meta">
        <span>${icons.calendar()}${formatRange(f.startDate, f.endDate, withYear)}</span>
        <span>${icons.route()}${Number(f.distanceKm).toFixed(1)}km</span>
        <span>${icons.pin()}${esc([f.prefecture, f.city].filter(Boolean).join(' '))}</span>
      </div>
      ${f.summary ? `<p class="summary">${esc(f.summary)}</p>` : ''}
    </a>`;
}

function syncUrl({ from, to }) {
  const q = new URLSearchParams({ from, to, radiusKm });
  history.replaceState(null, '', `?${q}`);
}

async function load(state) {
  const { loc, from, to } = state;
  syncUrl(state);
  const seq = ++requestSeq;
  skeleton();

  const q = new URLSearchParams({
    lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6), radiusKm, from, to,
  });

  try {
    const data = await api(`/api/festivals?${q}`);
    if (seq !== requestSeq) return; // 더 최신 요청이 있음

    const list = data.festivals || [];
    if (list.length === 0) {
      notice(`근처 100km 안에 등록된 축제가 없어요.<br>
        <span class="muted">위쪽 위치 칩을 눌러 테스트 도시를 바꿔 보세요. (예: 오사카, 교토)</span>`);
      resultsEl.innerHTML = '';
      return;
    }

    if (data.fallback) {
      notice(`${formatRange(from, to, true)} 에는 등록된 축제가 없어요.<br>
        <span class="muted">대신 근처에서 가장 가까운 일정을 보여 드려요. 축제는 다음 개최 일정 1회분만 등록돼 있어요.</span>`);
    } else if (data.searchedRadiusKm > radiusKm) {
      notice(`반경 ${radiusKm}km에 없어서 ${data.searchedRadiusKm}km까지 넓혀 찾았어요`);
    } else {
      noticeEl.innerHTML = '';
    }
    resultsEl.innerHTML = list.map(f => card(f, data.fallback)).join('');
  } catch (e) {
    if (seq !== requestSeq) return;
    resultsEl.innerHTML = `<button type="button" class="btn btn-outline btn-block" data-retry>다시 시도</button>`;
    notice(esc(e.message), 'error');
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
