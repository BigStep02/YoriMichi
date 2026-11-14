// F-02 축제 상세
import { api } from './api.js';
import { renderHeader } from './header.js';
import { formatRange, dDayLabel } from './dates.js';
import { icons, lanternIllustration, esc } from './icons.js';

renderHeader();

const heroEl = document.getElementById('hero');
const contentEl = document.getElementById('content');
const id = new URLSearchParams(location.search).get('id');

// 목록에서 왔으면 뒤로가기로 검색 조건 유지
const backHref = document.referrer.includes('/festivals.html') ? 'javascript:history.back()' : '/festivals.html';
const backLink = `<a class="back" href="${backHref}">${icons.back()}축제 목록</a>`;

function renderLoading() {
  heroEl.innerHTML = `${backLink}${lanternIllustration}<h1>불러오는 중…</h1>`;
  contentEl.innerHTML = `
    <div class="skeleton" style="margin-top:20px" aria-hidden="true">
      <div class="bar" style="width:50%"></div><div class="bar" style="width:80%"></div><div class="bar"></div>
    </div>`;
}

function renderError(message) {
  heroEl.innerHTML = `${backLink}${lanternIllustration}<h1>축제를 불러오지 못했어요</h1>`;
  contentEl.innerHTML = `
    <div class="notice error" style="margin-top:20px">${icons.info()}<div>${esc(message)}</div></div>
    <button type="button" class="btn btn-outline btn-block" data-retry>다시 시도</button>`;
  contentEl.querySelector('[data-retry]').addEventListener('click', load);
}

function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch { return null; }
}

function render(f) {
  document.title = `${f.name} · YoriMichi`;
  const ended = !f.ongoing && f.dDay < 0;
  heroEl.innerHTML = `
    ${backLink}
    ${lanternIllustration}
    <h1>${esc(f.name)}</h1>
    ${f.nameJa ? `<p class="name-ja" lang="ja">${esc(f.nameJa)}</p>` : ''}
    <span class="badge${ended ? ' ended' : ''}">${dDayLabel(f.dDay, f.ongoing)}</span>`;

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`;
  const official = f.officialUrl ? safeUrl(f.officialUrl) : null;

  contentEl.innerHTML = `
    <ul class="info-list">
      <li>${icons.calendar()}<span class="label">기간</span><span>${formatRange(f.startDate, f.endDate)}</span></li>
      <li>${icons.pin()}<span class="label">지역</span><span>${esc([f.prefecture, f.city].filter(Boolean).join(' '))}</span></li>
    </ul>

    <h2 class="section-title">소개</h2>
    <p class="prose">${esc(f.description)}</p>

    ${f.tips ? `<h2 class="section-title">팁</h2><div class="tips"><p class="prose">${esc(f.tips)}</p></div>` : ''}

    <div class="actions">
      <a class="btn btn-primary" href="${esc(mapUrl)}" target="_blank" rel="noopener">${icons.map()}구글맵에서 보기</a>
      ${official ? `<a class="btn btn-outline" href="${esc(official)}" target="_blank" rel="noopener">${icons.link()}공식 사이트</a>` : ''}
    </div>
    ${f.verifiedAt ? `<p class="muted center" style="margin-top:16px">정보 확인일 ${esc(f.verifiedAt)}</p>` : ''}`;
}

async function load() {
  if (!id || !/^\d+$/.test(id)) {
    renderError('잘못된 주소예요. 축제 목록에서 다시 선택해 주세요.');
    return;
  }
  renderLoading();
  try {
    render(await api(`/api/festivals/${id}`));
  } catch (e) {
    renderError(e.status === 404 ? '해당 축제를 찾을 수 없어요.' : e.message);
  }
}

load();
