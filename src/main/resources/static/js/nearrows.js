// 홈 寄り道 · 지금 근처 전체: 축제 줄 / 놀거리 줄 (둘 다 상세 페이지로 이동)
import { dDayLabel, formatRange, todayTokyo } from './dates.js';
import { icons, esc } from './icons.js';
import { kindIcon, kindLabel } from './spotsheet.js';
import { regionKo } from './regions.js';
import { saveButton, festKey, spotKey } from './saved.js';

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
export function festCard(f) {
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
/** link=true(홈): 누르면 상세 페이지로 가는 링크 (저장 버튼은 링크 밖에 — 링크 안 버튼은 router가 이동시킴) / 기본(지금 근처): 누르면 상세 시트 */
export function spotCard(s, i, { link = false } = {}) {
  const open = s.openNow === true ? '<span class="sp-open on">영업 중</span>'
             : s.openNow === false ? '<span class="sp-open off">영업 전·종료</span>' : '';
  const card = `
    <${link ? `a href="/spot.html?id=${encodeURIComponent(s.id)}"` : `div role="button" tabindex="0" data-i="${i}"`} class="r-item sp-item" data-kind="${esc(s.kind || '')}">
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
      ${link ? '' : saveButton(spotKey(s.id), { type: 'SPOT', spotId: s.id }, 'mini')}
    </${link ? 'a' : 'div'}>`;
  return link ? `<div class="f-wrap">${card}${saveButton(spotKey(s.id), { type: 'SPOT', spotId: s.id }, 'mini')}</div>` : card;
}
