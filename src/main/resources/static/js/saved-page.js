// 저장함(縁帳): 저장한 코스·축제·놀거리·맛집. 외부 호출 0 (맛집은 [인연 열기] 때만 Details 1회)
// 맛집은 place_id만 저장되어 있으므로 '봉인 카드'로 보여줌 — 이름 대신 만난 곳·도시·메모
import { api, getToken } from './api.js';
import { renderHeader } from './header.js';
import { regionKo } from './regions.js';
import { icons, esc } from './icons.js';
import { kindIcon, kindLabel } from './spotsheet.js';
import { openRestaurantSheet, placeMapsUrl } from './rsheet.js';
import { saveButton, syncSave, toast, OMAMORI } from './saved.js';
import { formatRange } from './dates.js';

renderHeader();
document.getElementById('back-link').insertAdjacentHTML('afterbegin', icons.back());

const listEl = document.getElementById('list');
const tabButtons = document.querySelectorAll('[data-tab]');
const qp = new URLSearchParams(location.search);
const TABS = ['ALL', 'COURSE', 'FESTIVAL', 'SPOT', 'RESTAURANT'];
let tab = TABS.includes(qp.get('tab')) ? qp.get('tab') : 'ALL';
let items = [];

const dateLabel = (iso) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()}`; };

// ── 카드 ──

function festCard(it) {
  const f = it.festival;
  const [, m, d] = (f.startDate || '--').split('-').map(Number);
  const badge = f.status === 'ONGOING' ? '<span class="mini-badge open">진행 중</span>'
    : f.status === 'UPCOMING' ? `<span class="mini-badge">D-${f.dDay}</span>`
    : '<span class="mini-badge closed">올해 끝남</span>';
  return row(it, `
    <a class="next-card${f.status === 'ENDED' ? ' sv-ended' : ''}" href="/festival.html?id=${encodeURIComponent(f.id)}">
      <div class="date-box"><div class="m">${m || ''}월</div><div class="d">${d || ''}</div></div>
      <div class="info">
        <div class="t">${esc(f.name)}</div>
        ${f.nameJa ? `<div class="ja" lang="ja">${esc(f.nameJa)}</div>` : ''}
        <div class="meta">${badge}${esc(regionKo(f.prefecture, f.city))}${f.startDate ? ` · ${esc(formatRange(f.startDate, f.endDate))}` : ''}</div>
      </div>
    </a>`, { type: 'FESTIVAL', festivalId: f.id });
}

function spotCard(it) {
  const s = it.spot;
  const badge = s.openNow === true ? '<span class="mini-badge open">영업 중</span>'
    : s.openNow === false ? '<span class="mini-badge closed">영업 전·종료</span>' : '';
  return row(it, `
    <a class="next-card spot" href="/spot.html?id=${encodeURIComponent(s.id)}">
      <div class="date-box kind-box" aria-hidden="true">${kindIcon(s.kind)}</div>
      <div class="info">
        <div class="t">${esc(s.name)}</div>
        ${s.nameJa ? `<div class="ja" lang="ja">${esc(s.nameJa)}</div>` : ''}
        <div class="meta">${badge}${esc(kindLabel(s.kind))} · ${esc(regionKo(s.prefecture, s.city))}</div>
      </div>
    </a>`, { type: 'SPOT', spotId: s.id });
}

/** 봉인 카드: 구글 정보 없이 우리 데이터만. 메모 첫 줄이 있으면 그게 제목 */
function restCard(it) {
  const r = it.restaurant;
  const region = regionKo(r.prefecture, r.city);
  const memoTitle = it.memo ? it.memo.split('\n')[0] : '';
  const where = r.metName ? `${r.metName} 근처에서` : region ? `${region}에서` : '여행 중에';
  const title = memoTitle || `${where} 만난 맛집`;
  const sub = [memoTitle ? `${where} 만남` : region, dateLabel(it.createdAt)].filter(Boolean).join(' · ');
  return `
    <article class="sv-seal" data-id="${it.id}">
      <span class="sv-seal-mark" lang="ja" aria-hidden="true">封</span>
      <div class="sv-seal-body">
        <span class="sv-kicker">🍴 맛집 · 봉인된 인연</span>
        <h3 class="sv-seal-t">${esc(title)}</h3>
        <p class="sv-seal-sub">${esc(sub)}</p>
        ${it.memo && memoTitle !== it.memo ? `<p class="sv-memo">${esc(it.memo)}</p>` : ''}
        <div class="cx-actions">
          <button type="button" class="dp-main" data-open="${esc(r.placeId)}" data-met-type="${esc(r.metType || '')}" data-met-id="${r.metId ?? ''}">인연 열기</button>
          <a class="dp-ico" href="${esc(placeMapsUrl(r.placeId))}" target="_blank" rel="noopener" aria-label="구글 지도" title="구글 지도">${icons.map('icon')}</a>
          <button type="button" class="dp-ico" data-memo="${it.id}" aria-label="메모" title="메모">✎</button>
          ${saveButton(it.key, { type: 'RESTAURANT', placeId: r.placeId, metType: r.metType || undefined, metId: r.metId ?? undefined, memo: it.memo || undefined }, 'ico')}
        </div>
      </div>
    </article>`;
}

function courseCard(it) {
  const c = it.course;
  const NODE = ['壱', '弐', '参', '肆'];
  const step = (s, i) => {
    let label, body;
    if (s.type === 'SPOT') {
      label = `${kindIcon(s.kind)} 명소`;
      body = `<a class="sv-step-name" href="/spot.html?id=${s.id}">${esc(s.name)}</a>`;
    } else if (s.type === 'FESTIVAL') {
      label = '🏮 축제';
      body = `<a class="sv-step-name" href="/festival.html?id=${s.id}">${esc(s.name)}</a>`;
    } else if (s.type === 'PLACE') {
      label = '명소';
      body = `<a class="sv-step-name" href="${esc(placeMapsUrl(s.placeId))}" target="_blank" rel="noopener">구글 지도에서 보기 ↗</a>`;
    } else {
      const met = c.stops.find(x => x.type === 'SPOT' || x.type === 'FESTIVAL');
      label = '🍴 맛집';
      body = `<button type="button" class="sv-step-open" data-open="${esc(s.placeId)}" data-met-type="${met?.type || ''}" data-met-id="${met?.id ?? ''}"><span lang="ja">封</span> 인연 열기</button>`;
    }
    return `
      <li class="sv-step">
        <span class="cx-node ${s.type === 'RESTAURANT' ? 'rest' : s.type === 'FESTIVAL' ? 'fest' : 'spot'}"><span lang="ja">${NODE[i] || i + 1}</span></span>
        <div><span class="cx-label">${label}</span>${body}</div>
      </li>`;
  };
  const first = c.stops.find(s => s.prefecture || s.city);
  return `
    <article class="sv-course" data-id="${it.id}">
      <header class="sv-course-h">
        <span class="cx-seal" lang="ja">縁</span>
        <div class="cx-head-t">
          <span class="cx-kicker">${esc(first ? regionKo(first.prefecture, first.city) : '오늘의 코스')} · ${dateLabel(it.createdAt)}</span>
          <b>${it.memo ? esc(it.memo.split('\n')[0]) : '엮은 코스'}</b>
        </div>
        ${saveButton(it.key, { type: 'COURSE', memo: it.memo || undefined, course: { preset: c.preset, stops: c.stops.map(x => ({ type: x.type, id: x.id ?? undefined, placeId: x.placeId ?? undefined })) } }, 'ico')}
      </header>
      <ol class="sv-steps">${c.stops.map(step).join('<li class="sv-thread" aria-hidden="true"></li>')}</ol>
    </article>`;
}

function row(it, inner, body) {
  return `<div class="sv-row" data-id="${it.id}">${inner}${saveButton(it.key, body, 'ico')}</div>${it.memo ? `<p class="sv-memo sv-row-memo">${esc(it.memo)}</p>` : ''}`;
}

const CARD = { FESTIVAL: festCard, SPOT: spotCard, RESTAURANT: restCard, COURSE: courseCard };
const SEC = { COURSE: '縁 엮은 코스', FESTIVAL: '🏮 축제', SPOT: '놀거리', RESTAURANT: '🍴 맛집' };

// ── 그리기 ──

function render() {
  tabButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
  if (!items.length) {
    listEl.innerHTML = `
      <div class="sv-empty">
        <span class="sv-empty-ic">${OMAMORI}</span>
        <p><b>아직 맺은 인연이 없어요</b></p>
        <p class="muted">뽑기에서 마음에 드는 곳을 만나면 お守り 버튼으로 저장해 보세요.</p>
        <a class="btn-primary" href="/draw.html">오늘의 우연 잇기</a>
      </div>`;
    return;
  }
  const types = tab === 'ALL' ? ['COURSE', 'FESTIVAL', 'SPOT', 'RESTAURANT'] : [tab];
  const html = types.map(t => {
    const list = items.filter(it => it.type === t);
    if (!list.length) return tab === 'ALL' ? '' : '<p class="muted empty-line">이 종류는 아직 저장한 게 없어요.</p>';
    return `
      <div class="sec-title nb-sec"><h2>${SEC[t]}</h2><span class="sec-sub">${list.length}</span></div>
      <div class="sv-list">${list.map(CARD[t]).join('')}</div>`;
  }).join('');
  listEl.innerHTML = html + (types.includes('RESTAURANT') && items.some(i => i.type === 'RESTAURANT')
    ? '<p class="attribution">맛집은 Google 장소 ID만 저장해요 · 가게 정보: Google 지도</p>' : '');

  listEl.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
    const ctx = b.dataset.metId ? { metType: b.dataset.metType, metId: Number(b.dataset.metId) } : {};
    openRestaurantSheet({ placeId: b.dataset.open }, ctx);
  }));
  listEl.querySelectorAll('[data-memo]').forEach(b => b.addEventListener('click', () => editMemo(Number(b.dataset.memo))));
  syncSave(listEl);
}

async function editMemo(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  const memo = prompt('메모 (첫 줄은 카드 제목이 돼요)', it.memo || '');
  if (memo === null) return;
  try {
    const updated = await api(`/api/saved/${id}`, { method: 'PATCH', body: { memo: memo.slice(0, 500) } });
    items = items.map(x => x.id === id ? updated : x);
    render();
  } catch (e) {
    toast(e.message || '메모를 저장하지 못했어요');
  }
}

async function load() {
  if (!getToken()) {
    listEl.innerHTML = `
      <div class="sv-empty">
        <span class="sv-empty-ic">${OMAMORI}</span>
        <p><b>로그인하면 縁帳을 쓸 수 있어요</b></p>
        <p class="muted">뽑은 코스와 맛집·축제·놀거리를 모아 둘 수 있어요.</p>
        <a class="btn-primary" href="/login.html?next=${encodeURIComponent('/saved.html')}">로그인</a>
      </div>`;
    return;
  }
  listEl.innerHTML = '<div class="skeleton-row" style="height:84px"></div><div class="skeleton-row" style="height:84px;margin-top:10px"></div>';
  try {
    items = await api('/api/saved');
    render();
  } catch (e) {
    listEl.innerHTML = `<p class="muted empty-line">${esc(e.message)}</p><div class="r-actions"><button type="button" class="btn-ghost" data-retry>다시 시도</button></div>`;
    listEl.querySelector('[data-retry]').addEventListener('click', load);
  }
}

tabButtons.forEach(b => b.addEventListener('click', () => {
  tab = b.dataset.tab;
  const u = new URL(location.href);
  tab === 'ALL' ? u.searchParams.delete('tab') : u.searchParams.set('tab', tab);
  history.replaceState(history.state, '', u);
  render();
}));

load();
