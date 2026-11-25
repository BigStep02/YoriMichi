// 놀거리 공통: 종류 이름·아이콘, 상세 시트 (근처 놀거리 목록, 코스 뽑기에서 같이 씀)
import { api } from './api.js';
import { mountSheet } from './sheet.js';
import { icons, esc, TORII } from './icons.js';
import { regionKo } from './regions.js';
import { saveButton, syncSave, spotKey } from './saved.js';

export const KIND_META = {
  SHRINE_TEMPLE: { label: '신사·절',       icon: TORII },
  PARK_GARDEN:   { label: '공원·정원',     icon: '🌸' },
  HISTORIC:      { label: '성·옛 거리',    icon: '🏯' },
  MUSEUM:        { label: '박물관·미술관', icon: '🏛' },
  VIEWPOINT:     { label: '전망·경치',     icon: '🌄' },
  MARKET:        { label: '시장',          icon: '🏮' },
  AMUSEMENT:     { label: '유원지·수족관', icon: '🎡' },
  ONSEN:         { label: '온천',          icon: '♨' },
};
export const kindLabel = (k) => KIND_META[k]?.label ?? k ?? '';
export const kindIcon  = (k) => KIND_META[k]?.icon  ?? '📍';

const DAY_KO = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' };
export function closedKo(v) {
  if (!v) return '';
  if (v === 'NONE') return '정기 휴일 없음';
  return v.split(',').map(d => DAY_KO[d.trim()] ?? d.trim()).join('·') + '요일 휴무';
}

export function spotMapsUrl(s) {
  const q = `${s.lat},${s.lng}`;
  return s.googlePlaceId
    ? `https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${encodeURIComponent(s.googlePlaceId)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.nameJa || s.name)}`;
}

/** s: 목록 항목(id 필수). 상세는 /api/spots/{id}로 불러와 채움 */
export async function openSpotSheet(s) {
  const body = `
    <div class="result-top">
      <span class="type-chip">${kindIcon(s.kind)} ${esc(kindLabel(s.kind))}</span>
      ${s.openNow === true ? '<span class="open-badge">영업 중</span>' : s.openNow === false ? '<span class="closed-badge">영업 전·종료</span>' : ''}
      ${s.id ? saveButton(spotKey(s.id), { type: 'SPOT', spotId: s.id }) : ''}
    </div>
    <h3 class="r-name">${esc(s.name)}</h3>
    ${s.nameJa ? `<p class="r-name-ko" lang="ja">${esc(s.nameJa)}</p>` : ''}
    <p class="muted">${esc(regionKo(s.prefecture, s.city))}${s.distanceKm != null ? ` · ${Number(s.distanceKm).toFixed(1)}km` : ''}</p>
    <div data-spot-body><div class="sk-line"></div><div class="sk-line short"></div></div>`;
  const footer = `
    <div class="r-actions" style="margin-top:0">
      <a class="btn-primary" data-spot-map href="${esc(spotMapsUrl(s))}" target="_blank" rel="noopener">${icons.map('icon')} 구글 지도에서 길찾기</a>
      <a class="btn-sub" href="/restaurants.html?lat=${s.lat}&lng=${s.lng}&near=${encodeURIComponent(s.name)}">근처 맛집 보기 →</a>
    </div>`;
  const wrap = mountSheet('놀거리 정보', body, { footer });
  syncSave(wrap);
  if (!s.id) { wrap.querySelector('[data-spot-body]').innerHTML = s.summary ? `<p>${esc(s.summary)}</p>` : ''; return; }

  const d = await api(`/api/spots/${encodeURIComponent(s.id)}`, { auth: false }).catch(() => null);
  if (!wrap.isConnected) return;
  const el = wrap.querySelector('[data-spot-body]');
  if (!d) { el.innerHTML = '<p class="ai-muted">정보를 불러오지 못했어요</p>'; return; }

  wrap.querySelector('[data-spot-map]').href = spotMapsUrl(d);
  const row = (k, v) => v ? `<div class="sp-row"><span class="sp-k">${k}</span><span>${v}</span></div>` : '';
  const seasons = d.seasons?.length
    ? `<details class="sp-season"><summary>기간별 운영시간</summary>${d.seasons.map(x => row(esc(x.period), esc(x.hours))).join('')}</details>` : '';
  el.innerHTML = `
    <section class="sp-info">
      ${row('오늘', esc(d.hoursLabel || ''))}
      ${row('휴무', esc(closedKo(d.closedDays)))}
      ${row('요금', esc(d.feeNote || ''))}
      ${row('참고', esc(d.hoursNote || ''))}
      ${seasons}
    </section>
    ${d.description ? `<p class="sp-desc">${esc(d.description)}</p>` : ''}
    ${d.tips ? `<div class="ai-box"><div class="ai-head">알아두면 좋아요</div><p class="sp-desc">${esc(d.tips)}</p></div>` : ''}
    ${d.officialUrl ? `<a class="sp-official" href="${esc(d.officialUrl)}" target="_blank" rel="noopener"><span>공식 사이트</span><span aria-hidden="true">↗</span></a>` : ''}
    <p class="attribution">운영시간·요금은 바뀔 수 있어요${d.verifiedAt ? ` · ${esc(d.verifiedAt)} 확인` : ''}</p>`;
}
