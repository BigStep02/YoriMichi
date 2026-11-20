// F-02 축제 상세
import { api } from './api.js';
import { renderHeader } from './header.js';
import { dDayLabel } from './dates.js';
import { regionKo } from './regions.js';
import { icons, esc } from './icons.js';

renderHeader();

const heroEl = document.getElementById('hero');
const contentEl = document.getElementById('content');
const id = new URLSearchParams(location.search).get('id');

// 목록에서 왔으면 뒤로가기로 검색 조건 유지
const backHref = document.referrer.includes('/festivals.html') ? 'javascript:history.back()' : '/festivals.html';
const backLink = `<a class="back on-dark" href="${backHref}">${icons.back()}축제 목록</a>`;
const WD = ['일', '월', '화', '수', '목', '금', '토'];

const lantern = `<svg class="f-hero-lamp" viewBox="0 0 40 56" aria-hidden="true"><rect x="12" y="0" width="16" height="5" rx="2" fill="#F7B4A3"/><ellipse cx="20" cy="27" rx="17" ry="20" fill="#F2765C"/><path d="M4 20h32M3 27h34M4 34h32" stroke="#fff" stroke-opacity=".35" stroke-width="1.6"/><rect x="12" y="46" width="16" height="5" rx="2" fill="#F7B4A3"/></svg>`;

function fullDate(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${y}.${m}.${d} (${WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`;
}
function shortRange(f) {
  const s = f.startDate.slice(5).replace('-', '.').replace(/^0/, '').replace(/\.0/, '.');
  const e = f.endDate.slice(5).replace('-', '.').replace(/^0/, '').replace(/\.0/, '.');
  return f.startDate === f.endDate ? s : `${s} – ${e}`;
}
function safeUrl(url) {
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null; }
  catch { return null; }
}

function renderLoading() {
  heroEl.innerHTML = `${backLink}${lantern}<div class="f-hero-kicker">&nbsp;</div><h1>불러오는 중…</h1>`;
  contentEl.innerHTML = '<div class="f-sec skeleton-row" style="height:120px" aria-hidden="true"></div>';
}

function renderError(message) {
  heroEl.innerHTML = `${backLink}${lantern}<h1>축제를 불러오지 못했어요</h1>`;
  contentEl.innerHTML = `
    <div class="f-empty">${esc(message)}</div>
    <div class="r-actions"><button type="button" class="btn-ghost" data-retry>다시 시도</button></div>`;
  contentEl.querySelector('[data-retry]').addEventListener('click', load);
}

function render(f) {
  document.title = `${f.name} · YoriMichi`;
  // 3D 신사 배경 하늘에 축제 이름을 불꽃 글자로 (일본어 이름이 짧을 때만)
  const skyName = (f.nameJa || '').replace(/\s+/g, '');
  if (skyName && [...skyName].length <= 6) window.dispatchEvent(new CustomEvent('yori:glyph', { detail: skyName }));
  const [, em, ed] = f.endDate.split('-').map(Number);
  const kicker = f.ongoing ? `진행 중 · ${em}월 ${ed}일까지`
    : f.dDay < 0 ? '종료된 일정' : `${dDayLabel(f.dDay, f.ongoing)} · ${fullDate(f.startDate)} 시작`;
  const region = regionKo(f.prefecture, f.city);

  heroEl.innerHTML = `
    ${backLink}
    ${lantern}
    <div class="f-hero-kicker">${esc(kicker)}</div>
    <h1>${esc(f.name)}</h1>
    ${f.nameJa ? `<p class="f-hero-ja" lang="ja">${esc(f.nameJa)}</p>` : ''}
    <div class="f-hero-chips"><span>${shortRange(f)}</span><span>${esc(region)}</span></div>`;

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`;
  const nearbyUrl = `/restaurants.html?lat=${f.lat}&lng=${f.lng}&near=${encodeURIComponent(f.name)}`;
  const official = f.officialUrl ? safeUrl(f.officialUrl) : null;
  const sameYear = f.startDate.slice(0, 4) === f.endDate.slice(0, 4);
  const endText = sameYear ? fullDate(f.endDate).slice(5) : fullDate(f.endDate);
  const period = f.startDate === f.endDate ? fullDate(f.startDate) : `${fullDate(f.startDate)} – ${endText}`;

  contentEl.innerHTML = `
    ${f.description ? `<section class="f-sec"><h2>어떤 축제예요?</h2><p>${esc(f.description)}</p></section>` : ''}
    ${f.tips ? `<section class="f-sec"><h2>이렇게 즐겨요</h2><p>${esc(f.tips)}</p></section>` : ''}
    <section class="f-sec">
      <h2>한눈에</h2>
      <dl class="f-facts">
        <dt>기간</dt><dd>${period}</dd>
        <dt>지역</dt><dd>${esc(region)}</dd>
        ${f.nameJa ? `<dt>현지 이름</dt><dd lang="ja">${esc(f.nameJa)}</dd>` : ''}
      </dl>
      <p class="f-verify">${f.verifiedAt ? `날짜 확인: ${esc(f.verifiedAt.replaceAll('-', '.'))} · ` : '날짜는 예년 일정 기준 추정이에요 · '}일정은 바뀔 수 있으니 공식 안내를 확인하세요</p>
    </section>
    <div class="r-actions">
      <a class="btn-primary" href="${esc(mapUrl)}" target="_blank" rel="noopener">${icons.map('icon')} 구글 지도에서 길찾기</a>
      <a class="btn-ghost" href="${esc(nearbyUrl)}">${icons.fork('icon')} 축제장 근처 맛집 보기</a>
      ${official ? `<a class="btn-sub" href="${esc(official)}" target="_blank" rel="noopener">공식 사이트 ↗</a>` : ''}
    </div>`;
}

async function load() {
  if (!id || !/^\d+$/.test(id)) { renderError('잘못된 주소예요. 축제 목록에서 다시 선택해 주세요.'); return; }
  renderLoading();
  try { render(await api(`/api/festivals/${id}`)); }
  catch (e) { renderError(e.status === 404 ? '해당 축제를 찾을 수 없어요.' : e.message); }
}
load();
