// 홈 寄り道 · 지금 근처 전체: 축제 줄 / 놀거리 줄 (둘 다 상세 페이지로 이동)
import { dDayLabel } from './dates.js';
import { icons, esc } from './icons.js';
import { kindIcon, kindLabel } from './spotsheet.js';

export function festRow(f, i = 0) {
  const [, m, d] = f.startDate.split('-').map(Number);
  const badge = f.ongoing || f.dDay >= 0
    ? `<span class="mini-badge">${dDayLabel(f.dDay, f.ongoing)}</span>` : '';
  return `
    <a class="next-card${i % 2 ? ' alt' : ''}" href="/festival.html?id=${encodeURIComponent(f.id)}">
      <div class="date-box"><div class="m">${m}월</div><div class="d">${d}</div></div>
      <div class="info">
        <div class="t">${esc(f.name)}</div>
        ${f.nameJa ? `<div class="ja" lang="ja">${esc(f.nameJa)}</div>` : ''}
        <div class="meta">${badge}축제 · ${esc(f.city || f.prefecture || '')} · ${Number(f.distanceKm).toFixed(1)}km</div>
      </div>
      ${icons.chevronRight()}
    </a>`;
}

export function spotRow(s) {
  const badge = s.openNow === true ? '<span class="mini-badge open">영업 중</span>'
    : s.openNow === false ? '<span class="mini-badge closed">영업 전·종료</span>' : '';
  return `
    <a class="next-card spot" href="/spot.html?id=${encodeURIComponent(s.id)}">
      <div class="date-box kind-box" aria-hidden="true">${kindIcon(s.kind)}</div>
      <div class="info">
        <div class="t">${esc(s.name)}</div>
        ${s.nameJa ? `<div class="ja" lang="ja">${esc(s.nameJa)}</div>` : ''}
        <div class="meta">${badge}${esc(kindLabel(s.kind))} · ${Number(s.distanceKm).toFixed(1)}km</div>
      </div>
      ${icons.chevronRight()}
    </a>`;
}

/** 축제: 진행 중·가까운 날짜 순, 같은 날이면 가까운 순 */
export const sortFests = (list) => list.slice().sort((a, b) =>
  a.startDate.localeCompare(b.startDate) || a.distanceKm - b.distanceKm);
/** 놀거리: 영업 중 먼저, 가까운 순 */
export const sortSpots = (list) => list.slice().sort((a, b) =>
  (b.openNow === true) - (a.openNow === true) || a.distanceKm - b.distanceKm);
