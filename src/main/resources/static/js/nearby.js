// N-01 지금 근처 寄り道 전체: 지금 위치에서 '지금 당장' 갈 수 있는 곳 — 오늘 열리는 축제 + 영업 중 놀거리 (둘 다 자체 DB라 Places 비용 0)
// 지역·날짜를 고르지 않음 — 여행 중 '지금 여기'에서 우연히 마주치는 느낌
import { api } from './api.js';
import { renderHeader } from './header.js';
import { getSearchLocation, clearGeoCache } from './location.js';
import { todayTokyo, formatRange, dDayLabel } from './dates.js';
import { icons, esc, TORII } from './icons.js';
import { sortFests, sortSpots } from './nearrows.js';
import { regionKo } from './regions.js';
import { kindLabel, kindIcon, openSpotSheet } from './spotsheet.js';
import { saveButton, syncSave, festKey, spotKey } from './saved.js';

renderHeader();
document.getElementById('back-link').insertAdjacentHTML('afterbegin', icons.back());
document.querySelectorAll('#here [data-ic]').forEach(el => { el.outerHTML = icons[el.dataset.ic]('icon'); });

const RADII = [10, 30, 50];
const qp = new URLSearchParams(location.search);
let radiusKm = RADII.includes(Number(qp.get('radiusKm'))) ? Number(qp.get('radiusKm')) : 10;
let tab = ['fest', 'spot'].includes(qp.get('tab')) ? qp.get('tab') : 'all';
let openOnly = true;   // 기본: 지금 문 연 곳만
let loc = null;
let seq = 0;
let fests = [], spots = [], festErr = '', spotErr = '';

const listEl = document.getElementById('list');
const radiusButtons = document.querySelectorAll('[data-radius]');
const tabButtons = document.querySelectorAll('[data-tab]');
const openRow = document.getElementById('open-row');

function renderControls() {
  radiusButtons.forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.radius) === radiusKm)));
  tabButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
  openRow.hidden = tab === 'fest';
}

// ── 카드: '근처 축제'·'근처 놀거리' 목록과 같은 모양 (CSS도 그 페이지 규칙을 같이 씀) ──
function dateBox(f) {
  if (f.ongoing) {
    const [, em, ed] = f.endDate.split('-').map(Number);
    return `<div class="date-box live"><div class="m">진행 중</div><div class="d">${ed}</div><div class="u">${em}월까지</div></div>`;
  }
  const [y, m, d] = f.startDate.split('-').map(Number);
  const yr = String(y) !== todayTokyo().slice(0, 4) ? `${String(y).slice(2)}년 ` : '';
  return `<div class="date-box"><div class="m">${yr}${m}월</div><div class="d">${d}</div></div>`;
}
function festCard(f) {
  const badge = f.ongoing ? '<span class="b-live">진행 중</span>' : `<span class="b-d">${dDayLabel(f.dDay, f.ongoing)}</span>`;
  return `
    <div class="f-wrap">
      <a class="f-item" href="/festival.html?id=${encodeURIComponent(f.id)}">
        ${dateBox(f)}
        <div class="f-main">
          <div class="f-top">${badge}</div>
          <div class="f-name">${esc(f.name)}</div>
          ${f.nameJa ? `<div class="f-ja" lang="ja">${esc(f.nameJa)}</div>` : ''}
          <div class="f-meta">${formatRange(f.startDate, f.endDate, false)} · ${esc(regionKo(f.prefecture, f.city))} · ${Number(f.distanceKm).toFixed(1)}km</div>
          ${f.summary ? `<p class="f-sum">${esc(f.summary)}</p>` : ''}
        </div>
      </a>
      ${saveButton(festKey(f.id), { type: 'FESTIVAL', festivalId: f.id }, 'mini')}
    </div>`;
}
const KIND_JA = { SHRINE_TEMPLE: '社', PARK_GARDEN: '園', HISTORIC: '城', MUSEUM: '館', VIEWPOINT: '景', MARKET: '市', AMUSEMENT: '遊', ONSEN: '湯' };
let shownSpots = [];
function spotCard(s, i) {
  const open = s.openNow === true ? '<span class="sp-open on">영업 중</span>'
             : s.openNow === false ? '<span class="sp-open off">영업 전·종료</span>' : '';
  return `
    <div class="r-item sp-item" role="button" tabindex="0" data-i="${i}" data-kind="${esc(s.kind || '')}">
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
      </span>
      ${saveButton(spotKey(s.id), { type: 'SPOT', spotId: s.id }, 'mini')}
    </div>`;
}
// 놀거리 카드를 누르면 '근처 놀거리'처럼 상세 시트 (저장 버튼은 제외)
listEl.addEventListener('click', (e) => {
  if (e.target.closest('.save-btn')) return;
  const el = e.target.closest('.sp-item[data-i]');
  if (el) openSpotSheet(shownSpots[Number(el.dataset.i)]);
});
listEl.addEventListener('keydown', (e) => {
  if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.matches('.sp-item[data-i]')) return;
  e.preventDefault();
  openSpotSheet(shownSpots[Number(e.target.dataset.i)]);
});

function section(title, count, rows, empty) {
  return `
    <div class="sec-title nb-sec"><h2>${title}</h2><span class="sec-sub">${count}곳</span></div>
    ${rows || `<p class="muted empty-line">${esc(empty)}</p>`}`;
}

function render() {
  const sv = openOnly ? spots.filter(s => s.openNow === true) : spots;
  const parts = [];
  shownSpots = sv;
  if (tab !== 'spot') parts.push(section('🏮 오늘 열리는 축제', fests.length, fests.map(festCard).join(''),
    festErr || '오늘 근처에서 열리는 축제는 없어요. 대신 놀거리를 둘러보세요.'));
  if (tab !== 'fest') parts.push(section(`${TORII} 놀거리${openOnly ? ' · 영업 중' : ''}`, sv.length, sv.map(spotCard).join(''),
    spotErr || (openOnly && spots.length ? '지금 영업 중인 곳이 없어요.' : '근처에 등록된 놀거리가 없어요. 범위를 넓혀 보세요.')));
  listEl.innerHTML = parts.join('');
  syncSave(listEl);
}

async function load() {
  if (!loc) return;
  const mySeq = ++seq;
  listEl.innerHTML = '<div class="next-card skeleton-row" aria-hidden="true"></div>'.repeat(3);
  const lat = loc.lat.toFixed(6), lng = loc.lng.toFixed(6);
  const from = todayTokyo();
  const fq = new URLSearchParams({ lat, lng, radiusKm, from, to: from });   // 오늘 열려 있는 축제만
  const sq = new URLSearchParams({ lat, lng, radiusKm });
  const [fr, sr] = await Promise.allSettled([api(`/api/festivals?${fq}`), api(`/api/spots?${sq}`, { auth: false })]);
  if (mySeq !== seq) return;
  fests = fr.status === 'fulfilled' ? sortFests(fr.value.festivals || []) : [];
  spots = sr.status === 'fulfilled' ? sortSpots(sr.value.spots || []) : [];
  festErr = fr.status === 'rejected' ? fr.reason?.message || '축제를 불러오지 못했어요.' : '';
  spotErr = sr.status === 'rejected' ? sr.reason?.message || '놀거리를 불러오지 못했어요.' : '';
  render();
}

// 탭·영업 중 스위치는 다시 불러오지 않고 화면만
tabButtons.forEach(b => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  renderControls();
  render();
  const u = new URL(location.href); u.searchParams.set('tab', tab); history.replaceState(history.state, '', u);
}));
document.getElementById('open-only').addEventListener('change', (e) => { openOnly = e.target.checked; render(); });
radiusButtons.forEach(b => b.addEventListener('click', () => {
  radiusKm = Number(b.dataset.radius);
  renderControls();
  load();
}));

renderControls();
listEl.innerHTML = '<div class="next-card skeleton-row" aria-hidden="true"></div>'.repeat(3);
async function locate(fresh = false) {
  const label = document.querySelector('[data-here-label]');
  const note = document.getElementById('here-note');
  label.textContent = '위치 확인 중…';
  if (fresh) clearGeoCache();
  loc = await getSearchLocation();
  label.textContent = loc.label;
  note.hidden = !loc.reason;
  note.textContent = loc.reason || '';
  load();
}
document.querySelector('[data-here-refresh]').addEventListener('click', () => locate(true));
locate();
