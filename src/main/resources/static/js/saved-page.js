// 저장함(縁帳): 저장한 코스·축제·놀거리·맛집
// 맛집은 place_id만 저장 → 카드 제목(가게 이름)은 /api/restaurants/names 로 그때그때 불러옴. 상세는 [상세 보기] 때만
// 메모는 제목을 바꾸지 않고 카드 아래 나무패(絵馬)로 따로 보여줌
import { api, getToken } from './api.js';
import { renderHeader } from './header.js';
import { regionKo } from './regions.js';
import { icons, esc } from './icons.js';
import { kindIcon, kindLabel } from './spotsheet.js';
import { openRestaurantSheet, placeMapsUrl } from './rsheet.js';
import { saveButton, syncSave, toast, OMAMORI } from './saved.js';
import { formatRange } from './dates.js';
import { mountSheet, closeSheet } from './sheet.js';

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
// 축제·놀거리·맛집 모두 같은 도장 카드: 위에 이름, 아래 지역만. 메모는 나무패로 따로

/** 메모 나무패. id를 주면 눌러서 고칠 수 있음 */
function memoNote(memo, id) {
  if (!memo) return '';
  const attr = id != null ? ` role="button" tabindex="0" data-memo="${id}" aria-label="메모 고치기"` : '';
  return `<div class="sv-note"${attr}><span class="sv-note-seal" lang="ja" aria-hidden="true">記</span><p>${esc(memo)}</p></div>`;
}

const latLngMapsUrl = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/** 공통 카드. o: { mark, tone, kicker, title, titleJa, sub, ended, main(html), map(url), body(저장 body) } */
function sealCard(it, o) {
  return `
    <article class="sv-seal tone-${o.tone}${o.ended ? ' sv-ended' : ''}" data-id="${it.id}">
      <span class="sv-seal-mark" lang="ja" aria-hidden="true">${o.mark}</span>
      <div class="sv-seal-body">
        <span class="sv-kicker">${o.kicker}</span>
        <h3 class="sv-seal-t"${o.titleAttr || ''}>${o.title}</h3>
        ${o.sub ? `<p class="sv-seal-sub">${esc(o.sub)}</p>` : ''}
        ${memoNote(it.memo, it.id)}
        <div class="cx-actions">
          ${o.main}
          ${o.map ? `<a class="dp-ico" href="${esc(o.map)}" target="_blank" rel="noopener" aria-label="구글 지도" title="구글 지도">${icons.map('icon')}</a>` : ''}
          <button type="button" class="dp-ico" data-memo="${it.id}" aria-label="${it.memo ? '메모 고치기' : '메모 남기기'}" title="메모">${MEMO_IC}</button>
          ${saveButton(it.key, { ...o.body, memo: it.memo || undefined }, 'ico')}
        </div>
      </div>
    </article>`;
}

function festCard(it) {
  const f = it.festival;
  const badge = f.status === 'ONGOING' ? '<span class="sv-badge live">진행 중</span>'
    : f.status === 'UPCOMING' ? `<span class="sv-badge">D-${f.dDay}</span>`
    : '<span class="sv-badge off">올해 끝남</span>';
  return sealCard(it, {
    mark: '祭', tone: 'fest', ended: f.status === 'ENDED',
    kicker: `🏮 축제 ${badge}`,
    title: esc(f.name),
    sub: [regionKo(f.prefecture, f.city), f.startDate ? formatRange(f.startDate, f.endDate) : ''].filter(Boolean).join(' · '),
    main: `<a class="dp-main" href="/festival.html?id=${encodeURIComponent(f.id)}">상세 보기</a>`,
    map: latLngMapsUrl(f.lat, f.lng),
    body: { type: 'FESTIVAL', festivalId: f.id },
  });
}

function spotCard(it) {
  const s = it.spot;
  const badge = s.openNow === true ? '<span class="sv-badge open">영업 중</span>'
    : s.openNow === false ? '<span class="sv-badge off">영업 전·종료</span>' : '';
  return sealCard(it, {
    mark: '遊', tone: 'spot',
    kicker: `${kindIcon(s.kind)} ${esc(kindLabel(s.kind))} ${badge}`,
    title: esc(s.name),
    sub: regionKo(s.prefecture, s.city),
    main: `<a class="dp-main" href="/spot.html?id=${encodeURIComponent(s.id)}">상세 보기</a>`,
    map: latLngMapsUrl(s.lat, s.lng),
    body: { type: 'SPOT', spotId: s.id },
  });
}

/** 맛집: DB엔 place_id만 있어서 이름은 그릴 때 따로 불러옴 (restNames) */
const restNames = new Map();
function restCard(it) {
  const r = it.restaurant;
  const name = restNames.get(r.placeId);
  return sealCard(it, {
    mark: '食', tone: 'rest',
    kicker: '🍴 맛집',
    title: name ? esc(name)
      : `<span class="sv-name-wait">${restNames.has(r.placeId) ? '이름을 불러오지 못했어요' : '가게 이름 불러오는 중'}</span>`,
    titleAttr: ` lang="ja" data-rname="${esc(r.placeId)}"`,
    sub: regionKo(r.prefecture, r.city),
    main: `<button type="button" class="dp-main" data-open="${esc(r.placeId)}" data-met-type="${esc(r.metType || '')}" data-met-id="${r.metId ?? ''}">상세 보기</button>`,
    map: placeMapsUrl(r.placeId),
    body: { type: 'RESTAURANT', placeId: r.placeId, metType: r.metType || undefined, metId: r.metId ?? undefined },
  });
}

/** 아직 이름 모르는 맛집만 한 번에 조회해서 카드 제목 채움 */
async function fillRestNames() {
  const ids = [...new Set(items.filter(i => i.type === 'RESTAURANT').map(i => i.restaurant.placeId))]
    .filter(id => !restNames.has(id));
  if (!ids.length) return;
  let map = {};
  try {
    map = await api(`/api/restaurants/names?ids=${ids.map(encodeURIComponent).join(',')}`, { auth: false }) || {};
  } catch { /* 이름 못 불러와도 카드는 그대로 */ }
  ids.forEach(id => restNames.set(id, map[id] || null));
  listEl.querySelectorAll('[data-rname]').forEach(el => {
    const n = restNames.get(el.dataset.rname);
    el.innerHTML = n ? esc(n) : '<span class="sv-name-wait">이름을 불러오지 못했어요</span>';
  });
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
      body = `<button type="button" class="sv-step-open" data-open="${esc(s.placeId)}" data-met-type="${met?.type || ''}" data-met-id="${met?.id ?? ''}"><span lang="ja">封</span> 상세 보기</button>`;
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
          <b>엮은 코스</b>
        </div>
        ${saveButton(it.key, { type: 'COURSE', memo: it.memo || undefined, course: { preset: c.preset, stops: c.stops.map(x => ({ type: x.type, id: x.id ?? undefined, placeId: x.placeId ?? undefined })) } }, 'ico')}
      </header>
      <ol class="sv-steps">${c.stops.map(step).join('<li class="sv-thread" aria-hidden="true"></li>')}</ol>
      ${memoNote(it.memo)}
    </article>`;
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

  fillRestNames();
  listEl.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
    const ctx = b.dataset.metId ? { metType: b.dataset.metType, metId: Number(b.dataset.metId) } : {};
    openRestaurantSheet({ placeId: b.dataset.open }, ctx);
  }));
  listEl.querySelectorAll('[data-memo]').forEach(b => {
    b.addEventListener('click', () => editMemo(Number(b.dataset.memo)));
    if (b.matches('.sv-note')) b.addEventListener('keydown', (e) => { if (e.key === 'Enter') editMemo(Number(b.dataset.memo)); });
  });
  syncSave(listEl);
}

const MEMO_MAX = 500;
const MEMO_IC = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20.5h4.2L19.6 9.1a2.1 2.1 0 0 0 0-3L17.9 4.4a2.1 2.1 0 0 0-3 0L3.5 15.8v4.7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13.4 5.9l4.7 4.7" stroke="currentColor" stroke-width="1.6"/></svg>';
const MEMO_CHIPS = ['꼭 다시 가기', '웨이팅 있음', '현금만', '예약 필요', '혼밥 OK'];

/** 메모 시트: 나무패(絵馬)에 적어 거는 느낌 */
function editMemo(id) {
  const it = items.find(x => x.id === id);
  if (!it) return;
  const where = it.festival?.name || it.spot?.name
    || (it.restaurant && restNames.get(it.restaurant.placeId)) || (it.course ? '엮은 코스' : '저장한 곳');
  const body = `
    <div class="memo-ema">
      <span class="memo-hole" aria-hidden="true"></span>
      <div class="memo-head">
        <span class="memo-seal" lang="ja" aria-hidden="true">記</span>
        <span class="memo-where">${esc(where)}</span>
      </div>
      <textarea class="memo-ta" data-ta maxlength="${MEMO_MAX}" rows="5" placeholder="다음에 뭐 먹을지, 누구랑 올지 적어 두세요" aria-label="메모">${esc(it.memo || '')}</textarea>
      <div class="memo-count"><b data-n>0</b> / ${MEMO_MAX}</div>
    </div>
    <div class="memo-chips" aria-label="빠르게 적기">
      ${MEMO_CHIPS.map(c => `<button type="button" class="memo-chip" data-chip="${esc(c)}">+ ${esc(c)}</button>`).join('')}
    </div>`;
  const footer = `
    <div class="memo-foot">
      ${it.memo ? '<button type="button" class="memo-del" data-del>지우기</button>' : ''}
      <button type="button" class="btn-primary memo-ok" data-ok>${it.memo ? '고쳐 걸기' : '걸어 두기'}</button>
    </div>`;
  const wrap = mountSheet(it.memo ? '메모 고치기' : '메모 남기기', body, { footer });
  wrap.querySelector('.sheet').classList.add('sheet-memo');
  const ta = wrap.querySelector('[data-ta]');
  const n = wrap.querySelector('[data-n]');
  const count = () => { n.textContent = ta.value.length; n.parentElement.classList.toggle('full', ta.value.length >= MEMO_MAX); };
  count();
  ta.addEventListener('input', count);
  setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 260);

  wrap.querySelectorAll('[data-chip]').forEach(b => b.addEventListener('click', () => {
    const add = b.dataset.chip;
    const v = ta.value.trimEnd();
    ta.value = (v ? `${v}\n${add}` : add).slice(0, MEMO_MAX);
    count(); ta.focus();
  }));

  const save = async (memo, btn) => {
    btn.disabled = true;
    try {
      const updated = await api(`/api/saved/${id}`, { method: 'PATCH', body: { memo: memo.slice(0, MEMO_MAX) } });
      items = items.map(x => x.id === id ? updated : x);
      closeSheet();
      render();
      toast(memo ? '메모를 걸어 뒀어요' : '메모를 지웠어요');
    } catch (e) {
      btn.disabled = false;
      toast(e.message || '메모를 저장하지 못했어요');
    }
  };
  wrap.querySelector('[data-ok]').addEventListener('click', (e) => save(ta.value.trim(), e.currentTarget));
  wrap.querySelector('[data-del]')?.addEventListener('click', (e) => save('', e.currentTarget));
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
