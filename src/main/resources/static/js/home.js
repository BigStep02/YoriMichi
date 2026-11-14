// 홈: 지역·날짜 바 + 축제 링크 + 곧 열리는 근처 축제 2개
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { todayTokyo, addDays, dDayLabel } from './dates.js';
import { icons, esc } from './icons.js';

renderHeader();

const ICON_CLASS = { dice: 'icon icon-lg', fork: 'icon cat-icon', lantern: 'icon cat-icon', arrowRight: 'icon' };
document.querySelectorAll('[data-icon]').forEach(el => {
  const name = el.dataset.icon;
  const wrapCls = el.className;
  const svg = icons[name](ICON_CLASS[name] || 'icon');
  if (wrapCls) el.innerHTML = svg; else el.outerHTML = svg;
});

const festivalLinks = [document.getElementById('festival-link'), document.getElementById('festival-all')];
const upcomingEl = document.getElementById('upcoming');

const UPCOMING_RADIUS_KM = 50;
const UPCOMING_DAYS = 90;
let seq = 0;

function updateLinks({ from, to }) {
  const href = `/festivals.html?${new URLSearchParams({ from, to })}`;
  festivalLinks.forEach(a => { a.href = href; });
}

function row(f, i) {
  const [, m, d] = f.startDate.split('-').map(Number);
  const badge = f.ongoing || f.dDay >= 0
    ? `<span class="mini-badge">${dDayLabel(f.dDay, f.ongoing)}</span>` : '';
  return `
    <a class="next-card${i % 2 ? ' alt' : ''}" href="/festival.html?id=${encodeURIComponent(f.id)}">
      <div class="date-box"><div class="m">${m}월</div><div class="d">${d}</div></div>
      <div class="info">
        <div class="t">${esc(f.name)}</div>
        ${f.nameJa ? `<div class="ja" lang="ja">${esc(f.nameJa)}</div>` : ''}
        <div class="meta">${badge}${esc(f.city || f.prefecture || '')} · ${Number(f.distanceKm).toFixed(1)}km</div>
      </div>
      ${icons.chevronRight()}
    </a>`;
}

async function loadUpcoming(loc) {
  const mySeq = ++seq;
  upcomingEl.innerHTML = '<div class="next-card skeleton-row" aria-hidden="true"></div>';
  const from = todayTokyo();
  const q = new URLSearchParams({
    lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6),
    radiusKm: UPCOMING_RADIUS_KM, from, to: addDays(from, UPCOMING_DAYS),
  });
  try {
    const data = await api(`/api/festivals?${q}`);
    if (mySeq !== seq) return;
    const list = (data.festivals || [])
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.distanceKm - b.distanceKm)
      .slice(0, 2);
    upcomingEl.innerHTML = list.length
      ? list.map(row).join('')
      : '<p class="muted empty-line">근처에 곧 열리는 축제가 없어요. 위치를 바꿔 보세요.</p>';
  } catch (e) {
    if (mySeq !== seq) return;
    upcomingEl.innerHTML = `<p class="muted empty-line">${esc(e.message)}</p>`;
  }
}

let lastLocKey = '';
const bar = mountSearchBar(document.getElementById('search-bar'), (state) => {
  updateLinks(state);
  const key = `${state.loc.lat},${state.loc.lng}`;
  if (key !== lastLocKey) { // 날짜만 바뀌면 다시 안 불러옴 (곧 열리는 축제는 오늘 기준)
    lastLocKey = key;
    loadUpcoming(state.loc);
  }
});
updateLinks(bar.state); // 위치 확인 전에도 날짜는 링크에 반영
