// 맛집 상세 시트 (AI 요약·리뷰·구글 지도·食べログ) — 맛집 목록, 코스 뽑기에서 같이 씀
import { api } from './api.js';
import { mountSheet } from './sheet.js';
import { icons, esc } from './icons.js';

const MOCK = new URLSearchParams(location.search).get('mock') === '1';

export function priceLabel(level) {
  if (level == null) return '';
  return level === 0 ? '무료' : '¥'.repeat(level);
}
export function walkLabel(m) {
  const min = Math.max(1, Math.round(m / 80));
  return `도보 ${min}분 · ${m >= 1000 ? (m / 1000).toFixed(1) + 'km' : m + 'm'}`;
}
/** 종류 표시: 한국어(있으면) + 일본어 */
export function typeChip(p, cls = 'type-chip') {
  if (!p.typeKo && !p.typeLabel) return '';
  const ja = p.typeLabel ? `<span lang="ja" class="ja-sub">${esc(p.typeLabel)}</span>` : '';
  return p.typeKo ? `<span class="${cls}">${esc(p.typeKo)}${p.typeLabel && p.typeLabel !== p.typeKo ? ' ' + ja : ''}</span>`
                  : `<span class="${cls}" lang="ja">${esc(p.typeLabel)}</span>`;
}
export function tabelogUrl(name) {
  return `https://tabelog.com/rstLst/?vs=1&sk=${encodeURIComponent(name)}&sw=${encodeURIComponent(name)}`;
}

export async function openRestaurantSheet(p) {
  const stats = [
    p.rating != null ? `<span class="star">★ ${p.rating.toFixed(1)}</span> <span class="muted">(${p.ratingCount.toLocaleString()})</span>` : '',
    walkLabel(p.distanceM),
    priceLabel(p.priceLevel),
  ].filter(Boolean).join('<span class="dot">·</span>');

  const body = `
    <div class="result-top">
      ${typeChip(p)}
      ${p.openNow ? '<span class="open-badge">영업 중</span>' : ''}
    </div>
    <h3 class="r-name" lang="ja">${esc(p.name)}</h3>
    <p class="r-name-ko" data-name-ko></p>
    <div class="r-stats">${stats}</div>
    <section class="ai-box" data-ai>
      <div class="ai-head">리뷰 한눈에 <span class="ai-tag">AI 요약</span></div>
      <div class="ai-body"><div class="sk-line"></div><div class="sk-line short"></div></div>
    </section>
    <section class="reviews" data-reviews></section>
    <p class="attribution">가게 정보·리뷰: Google 지도</p>`;
  const footer = `
    <div class="r-actions" style="margin-top:0">
      <a class="btn-primary" href="${esc(p.googleMapsUri)}" target="_blank" rel="noopener">${icons.map('icon')} 구글 지도에서 길찾기</a>
      <a class="btn-sub" href="${tabelogUrl(p.name)}" target="_blank" rel="noopener"><span lang="ja">食べログ</span>에서 보기 ↗</a>
    </div>`;
  const wrap = mountSheet('가게 정보', body, { footer });

  const detailP = MOCK ? mockDetail() : api(`/api/restaurants/${encodeURIComponent(p.placeId)}`, { auth: false }).catch(() => null);

  const d = await detailP;
  if (!wrap.isConnected) return;
  if (d?.nameKo && d.nameKo !== p.name) wrap.querySelector('[data-name-ko]').textContent = d.nameKo;
  const reviews = (d?.reviews || []).slice(0, 2);
  wrap.querySelector('[data-reviews]').innerHTML = reviews.length ? `
    <div class="rv-head">최근 리뷰</div>
    ${reviews.map(r => `
      <div class="rv">
        <div class="rv-meta">
          ${r.authorUri ? `<a href="${esc(r.authorUri)}" target="_blank" rel="noopener">${esc(r.author)}</a>` : esc(r.author)}
          <span class="star">${'★'.repeat(Math.round(r.rating || 0))}</span>
          <span class="muted">${esc(r.relativeTime || '')}</span>
        </div>
        <p class="rv-text">${esc(r.text)}</p>
      </div>`).join('')}` : '';

  const s = await new Promise(resolve => {
    if (MOCK) { mockSummary().then(resolve); return; }
    setTimeout(() => {
      if (!wrap.isConnected) { resolve(null); return; }
      api(`/api/restaurants/${encodeURIComponent(p.placeId)}/summary`, { auth: false })
        .catch(() => null)
        .then(resolve);
    }, 1500);
  });
  if (!wrap.isConnected) return;
  applySheetSummary(wrap, p.placeId, s, s?.reviewsUri || p.googleMapsUri);
}

async function applySheetSummary(wrap, placeId, s, fallbackLink) {
  const aiEl = wrap.querySelector('[data-ai]');
  if (!aiEl) return;

  if (s?.status === 'OK' && (s.pros?.length || s.cons?.length || s.menus?.length)) {
    const row = (label, cls, items) => items?.length
      ? `<div class="ai-row ${cls}"><span class="ai-k">${label}</span><span>${items.map(esc).join(', ')}</span></div>` : '';
    const attr = s.reviewsUri
      ? `<p class="ai-attr">Google 리뷰 요약 기반 · ${esc(s.reviewSummaryDisclosure || '')} · <a href="${esc(s.reviewsUri)}" target="_blank" rel="noopener">리뷰 보기 ↗</a></p>` : '';
    const fullText = s.fullKo || s.reviewSummaryText;
    const orig = fullText
      ? `<details class="ai-orig"><summary>요약 전문 보기</summary><p>${esc(fullText)}</p><p class="ai-attr">Google 리뷰 요약을 한국어로 번역했어요${s.reviewSummaryFlagUri ? ` · <a href="${esc(s.reviewSummaryFlagUri)}" target="_blank" rel="noopener" class="ai-flag">신고</a>` : ''}</p></details>` : '';
    aiEl.querySelector('.ai-body').innerHTML =
      row('좋아요', 'pro', s.pros) + row('참고', 'con', s.cons) + row('추천 메뉴', 'menu', s.menus) + attr + orig;
  } else if (s?.status === 'NO_SOURCE') {
    aiEl.querySelector('.ai-body').innerHTML = `
      <p class="ai-muted">리뷰가 아직 적어서 AI 요약이 없어요</p>
      <a href="${esc(fallbackLink)}" class="btn-ghost" target="_blank" rel="noopener">구글 지도에서 리뷰 보기 ↗</a>`;
  } else {
    aiEl.querySelector('.ai-body').innerHTML = `
      <p class="ai-muted">지금은 AI 요약을 불러오지 못했어요</p>
      <div class="ai-actions">
        <button type="button" class="btn-ghost" data-ai-retry>다시 시도</button>
        <a href="${esc(fallbackLink)}" class="btn-ghost" target="_blank" rel="noopener">구글 지도에서 리뷰 보기 ↗</a>
      </div>`;
    aiEl.querySelector('[data-ai-retry]').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.textContent = '불러오는 중…';
      btn.disabled = true;
      const retryS = MOCK ? await mockSummary()
        : await api(`/api/restaurants/${encodeURIComponent(placeId)}/summary?retry=true`, { auth: false }).catch(() => null);
      applySheetSummary(wrap, placeId, retryS, fallbackLink);
    });
  }
}

async function mockDetail() {
  await new Promise(r => setTimeout(r, 600));
  return { nameKo: '이치란 도톤보리점 본관', reviews: [] };
}
async function mockSummary() {
  await new Promise(r => setTimeout(r, 900));
  return {
    status: 'OK',
    pros: ['진한 돈코츠 국물', '1인석이라 혼밥 편함'],
    cons: ['저녁엔 대기 30분 이상'],
    menus: ['돈코츠 라멘', '카에다마'],
    fullKo: '손님들은 진한 돈코츠 육수와 칸막이가 있는 1인 좌석 구조를 높이 평가합니다. 매운맛과 면 익힘을 직접 선택할 수 있는 점도 인기 요소입니다. 저녁 시간대에는 대기가 30분을 넘는 경우도 있습니다.',
    reviewSummaryText: 'Diners praise the rich tonkotsu broth and the solo dining setup with privacy screens. The customizable spice level and noodle firmness are highlights. Evening waits can exceed 30 minutes.',
    reviewSummaryDisclosure: 'Gemini로 요약됨',
    reviewsUri: 'https://www.google.com/maps/place/ichiran+dotonbori',
    reviewSummaryFlagUri: 'https://www.google.com/local/content/rap/report',
  };
}
