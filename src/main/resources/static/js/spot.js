// S-02 놀거리 상세 (축제 상세와 같은 모양)
import { api } from './api.js';
import { renderHeader } from './header.js';
import { regionKo } from './regions.js';
import { icons, esc } from './icons.js';
import { saveButton, syncSave, spotKey } from './saved.js';
import { kindLabel, kindIcon, closedKo, spotMapsUrl } from './spotsheet.js';

renderHeader();

const heroEl = document.getElementById('hero');
const contentEl = document.getElementById('content');
const id = new URLSearchParams(location.search).get('id');

// 어디서 왔는지에 따라 뒤로가기 (목록이면 검색 조건 유지)
const prev = window.__spaPrev || document.referrer;
const back = prev.includes('/nearby.html') ? ['javascript:history.back()', '지금 근처']
  : prev.includes('/spots.html') ? ['javascript:history.back()', '놀거리 목록']
  : ['/', '홈으로'];
const backLink = `<a class="back on-dark" href="${back[0]}">${icons.back()}${back[1]}</a>`;

function safeUrl(url) {
  try { const u = new URL(url); return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null; }
  catch { return null; }
}

function renderLoading() {
  heroEl.innerHTML = `${backLink}<div class="f-hero-kicker">&nbsp;</div><h1>불러오는 중…</h1>`;
  contentEl.innerHTML = '<div class="f-sec skeleton-row" style="height:120px" aria-hidden="true"></div>';
}

function renderError(message) {
  heroEl.innerHTML = `${backLink}<h1>놀거리를 불러오지 못했어요</h1>`;
  contentEl.innerHTML = `
    <div class="f-empty">${esc(message)}</div>
    <div class="r-actions"><button type="button" class="btn-ghost" data-retry>다시 시도</button></div>`;
  contentEl.querySelector('[data-retry]').addEventListener('click', load);
}

function render(d) {
  document.title = `${d.name} · YoriMichi`;
  const skyName = (d.nameJa || '').replace(/\s+/g, '');
  if (skyName && [...skyName].length <= 6) window.dispatchEvent(new CustomEvent('yori:glyph', { detail: skyName }));

  const region = regionKo(d.prefecture, d.city);
  const state = d.openNow === true ? '지금 영업 중' : d.openNow === false ? '지금은 영업 전·종료' : '';
  const kicker = `<span class="kind-ic">${kindIcon(d.kind)}</span> ${esc([kindLabel(d.kind), state].filter(Boolean).join(' · '))}`;

  heroEl.innerHTML = `
    ${backLink}
    <div class="f-hero-kicker">${kicker}</div>
    <h1>${esc(d.name)}</h1>
    ${d.nameJa ? `<p class="f-hero-ja" lang="ja">${esc(d.nameJa)}</p>` : ''}
    <div class="f-hero-chips">${d.hoursLabel ? `<span>오늘 ${esc(d.hoursLabel)}</span>` : ''}<span>${esc(region)}</span></div>`;

  const fact = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
  const seasons = d.seasons?.length
    ? `<details class="sp-season"><summary>기간별 운영시간</summary>${d.seasons.map(x =>
        `<div class="sp-row"><span class="sp-k">${esc(x.period)}</span><span>${esc(x.hours)}</span></div>`).join('')}</details>` : '';
  const official = d.officialUrl ? safeUrl(d.officialUrl) : null;
  const near = `lat=${d.lat}&lng=${d.lng}&near=${encodeURIComponent(d.name)}`;

  contentEl.innerHTML = `
    ${d.description ? `<section class="f-sec"><h2>어떤 곳이에요?</h2><p>${esc(d.description)}</p></section>` : ''}
    ${d.tips ? `<section class="f-sec"><h2>이렇게 즐겨요</h2><p>${esc(d.tips)}</p></section>` : ''}
    <section class="f-sec">
      <h2>한눈에</h2>
      <dl class="f-facts">
        ${fact('오늘', d.hoursLabel)}
        ${fact('휴무', closedKo(d.closedDays))}
        ${fact('요금', d.feeNote)}
        ${fact('지역', region)}
        ${fact('참고', d.hoursNote)}
        ${d.nameJa ? `<dt>현지 이름</dt><dd lang="ja">${esc(d.nameJa)}</dd>` : ''}
      </dl>
      ${seasons}
      <p class="f-verify">${d.verifiedAt ? `정보 확인: ${esc(String(d.verifiedAt).replaceAll('-', '.'))} · ` : ''}운영시간·요금은 바뀔 수 있으니 공식 안내를 확인하세요</p>
    </section>
    <div class="r-actions">
      <a class="btn-primary" href="${esc(spotMapsUrl(d))}" target="_blank" rel="noopener">${icons.map('icon')} 구글 지도에서 길찾기</a>
      <a class="btn-ghost" href="/restaurants.html?${near}">${icons.fork('icon')} 근처 맛집 보기</a>
      <a class="btn-ghost" href="/festivals.html?${near}">${icons.lantern('icon')} 근처 축제 보기</a>
      ${saveButton(spotKey(d.id), { type: 'SPOT', spotId: d.id }, 'ghost')}
      ${official ? `<a class="btn-sub" href="${esc(official)}" target="_blank" rel="noopener">공식 사이트 ↗</a>` : ''}
    </div>`;
}

async function load() {
  if (!id || !/^\d+$/.test(id)) { renderError('잘못된 주소예요. 놀거리 목록에서 다시 선택해 주세요.'); return; }
  renderLoading();
  try { render(await api(`/api/spots/${id}`, { auth: false })); syncSave(contentEl); }
  catch (e) { renderError(e.status === 404 ? '해당 놀거리를 찾을 수 없어요.' : e.message); }
}
load();
