// 축제 상세 시트 (코스 뽑기 결과에서 페이지 이동 없이 보기)
import { api } from './api.js';
import { mountSheet } from './sheet.js';
import { icons, esc } from './icons.js';
import { regionKo } from './regions.js';
import { formatRange, dDayLabel } from './dates.js';

const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : null);

/** f: 코스 응답의 festival(id 필수). 설명·팁은 /api/festivals/{id}로 불러와 채움 */
export async function openFestivalSheet(f) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`;
  const status = f.ongoing ? '<span class="open-badge">진행 중</span>'
    : (f.dDay != null ? `<span class="type-chip">${esc(dDayLabel(f.dDay, f.ongoing))}</span>` : '');
  const body = `
    <div class="result-top">
      <span class="type-chip">🏮 축제</span>
      ${status}
    </div>
    <h3 class="r-name">${esc(f.name)}</h3>
    ${f.nameJa ? `<p class="r-name-ko" lang="ja">${esc(f.nameJa)}</p>` : ''}
    <p class="muted">${esc(regionKo(f.prefecture, f.city))}${f.distanceKm != null ? ` · ${Number(f.distanceKm).toFixed(1)}km` : ''}</p>
    <section class="sp-info">
      ${f.startDate ? `<div class="sp-row"><span class="sp-k">기간</span><span>${esc(formatRange(f.startDate, f.endDate))}</span></div>` : ''}
    </section>
    <div data-fest-body><div class="sk-line"></div><div class="sk-line short"></div></div>`;
  const footer = `
    <div class="r-actions" style="margin-top:0">
      <a class="btn-primary" href="${esc(mapUrl)}" target="_blank" rel="noopener">${icons.map('icon')} 구글 지도에서 길찾기</a>
      <a class="btn-sub" href="/festival.html?id=${encodeURIComponent(f.id)}">축제 페이지 전체 보기 →</a>
    </div>`;
  const wrap = mountSheet('축제 정보', body, { footer });

  const d = await api(`/api/festivals/${encodeURIComponent(f.id)}`, { auth: false }).catch(() => null);
  if (!wrap.isConnected) return;
  const el = wrap.querySelector('[data-fest-body]');
  if (!d) { el.innerHTML = f.summary ? `<p class="sp-desc">${esc(f.summary)}</p>` : '<p class="ai-muted">정보를 불러오지 못했어요</p>'; return; }
  const official = safeUrl(d.officialUrl);
  el.innerHTML = `
    ${d.description ? `<p class="sp-desc">${esc(d.description)}</p>` : ''}
    ${d.tips ? `<div class="ai-box"><div class="ai-head">이렇게 즐겨요</div><p class="sp-desc">${esc(d.tips)}</p></div>` : ''}
    ${official ? `<a class="sp-official" href="${esc(official)}" target="_blank" rel="noopener"><span>공식 사이트</span><span aria-hidden="true">↗</span></a>` : ''}
    <p class="attribution">${d.verifiedAt ? `날짜 확인: ${esc(String(d.verifiedAt).replaceAll('-', '.'))} · ` : '날짜는 예년 일정 기준이에요 · '}일정은 바뀔 수 있어요</p>`;
}
