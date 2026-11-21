// 아래에서 올라오는 시트: 지역 고르기 / 날짜(기간) 고르기
import { TEST_CITIES } from './location.js';
import { todayTokyo, addDays } from './dates.js';
import { esc } from './icons.js';
import { enableSheetSwipe, enableHSwipe } from './swipe.js';

let openSheet = null;

export function mountSheet(title, bodyHtml, { footer = '' } = {}) {
  closeSheet();
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `
    <div class="sheet-dim" data-close></div>
    <section class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-grip" aria-hidden="true"></div>
      <header class="sheet-head">
        <h2>${esc(title)}</h2>
        <button type="button" class="sheet-x" data-close aria-label="닫기">✕</button>
      </header>
      <div class="sheet-body">${bodyHtml}</div>
      ${footer ? `<footer class="sheet-foot">${footer}</footer>` : ''}
    </section>`;
  document.body.appendChild(wrap);
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => wrap.classList.add('show'));
  wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeSheet));
  const onKey = (e) => { if (e.key === 'Escape') closeSheet(); };
  document.addEventListener('keydown', onKey);
  const prevFocus = document.activeElement;
  openSheet = { wrap, onKey, prevFocus };
  enableSheetSwipe(wrap, closeSheet);   // 아래로 쓸어내리면 닫힘
  setTimeout(() => wrap.querySelector('.sheet-x').focus(), 50);
  return wrap;
}

export function closeSheet() {
  if (!openSheet) return;
  const { wrap, onKey, prevFocus } = openSheet;
  openSheet = null;
  document.removeEventListener('keydown', onKey);
  document.body.classList.remove('sheet-open');
  wrap.classList.remove('show');
  setTimeout(() => wrap.remove(), 220);
  prevFocus?.focus?.();
}

// ---------- 지역 ----------
export function openLocationSheet(current, onPick) {
  const regions = [...new Set(TEST_CITIES.map(c => c.region))];
  const body = `
    <button type="button" class="loc-geo${current === 'geo' ? ' on' : ''}" data-v="geo">
      <span class="geo-dot" aria-hidden="true"></span>
      <span><b>현재 위치</b><small>일본 밖이면 테스트 도시로 찾아요</small></span>
    </button>
    <p class="sheet-label">테스트 도시</p>
    ${regions.map(r => `
      <div class="region">
        <div class="region-name">${esc(r)}</div>
        <div class="city-grid">
          ${TEST_CITIES.filter(c => c.region === r).map(c => `
            <button type="button" class="city${current === c.key ? ' on' : ''}" data-v="${c.key}">${esc(c.short || c.name)}</button>`).join('')}
        </div>
      </div>`).join('')}`;
  const wrap = mountSheet('어디 근처에서 찾을까요?', body);
  wrap.querySelector('.sheet').classList.add('sheet-loc');
  wrap.querySelector('.sheet-body').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-v]');
    if (!btn) return;
    onPick(btn.dataset.v);
    closeSheet();
  });
  wrap.querySelector('.on')?.scrollIntoView({ block: 'center' });
}

// ---------- 날짜 ----------
const WD = ['일', '월', '화', '수', '목', '금', '토'];
// 달마다 옛 이름(和風月名) — 월 고르기 타일에 작게
const WAFU = ['睦月', '如月', '弥生', '卯月', '皐月', '水無月', '文月', '葉月', '長月', '神無月', '霜月', '師走'];
const SEASON = ['🎍', '🏮', '🌸', '🌸', '🎏', '☔', '🎋', '🎆', '🌕', '🍁', '🍁', '🔔'];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const label = (s) => { const d = parse(s); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };
const labelY = (s) => { const d = parse(s); return `${d.getFullYear()}년 ${label(s)}`; };

export function openDateSheet({ from, to }, onPick) {
  const today = todayTokyo();
  const max = addDays(today, 730);            // 내년 계획까지 (2년)
  let start = from;
  let end = to;
  let picking = 'start';
  let view = parse(from); view.setDate(1);
  let pick = null;                             // 'y' | 'm' | null

  const presets = (() => {
    const t = parse(today);
    const sat = new Date(t); sat.setDate(t.getDate() + ((6 - t.getDay() + 7) % 7));
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    return [
      { k: '오늘', f: today, t: today },
      { k: '이번 주말', f: ymd(sat), t: ymd(sun) },
      { k: '7일', f: today, t: addDays(today, 6) },
      { k: '한 달', f: today, t: addDays(today, 29) },
    ];
  })();

  const footer = `
    <div class="range-sum" data-sum></div>
    <button type="button" class="btn-primary sheet-ok" data-ok>이 기간으로 보기</button>`;
  const body = `
    <div class="preset-row">${presets.map((p, i) => `<button type="button" class="preset" data-p="${i}">${p.k}</button>`).join('')}</div>
    <div class="cal">
      <div class="cal-head">
        <button type="button" class="cal-nav" data-nav="-1" aria-label="이전 달">‹</button>
        <div class="cal-ym">
          <button type="button" class="ym-btn" data-pick="y" aria-label="연도 고르기"><b data-y></b>년<i>▾</i></button>
          <button type="button" class="ym-btn" data-pick="m" aria-label="월 고르기"><b data-m></b>월<small data-wafu></small><i>▾</i></button>
        </div>
        <button type="button" class="cal-nav" data-nav="1" aria-label="다음 달">›</button>
      </div>
      <div class="cal-stage">
        <div class="cal-days">
          <div class="cal-wd">${WD.map((w, i) => `<span class="${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${w}</span>`).join('')}</div>
          <div class="cal-grid" data-grid></div>
          <button type="button" class="cal-whole" data-whole>이 달 전체 고르기</button>
        </div>
        <div class="cal-pick" data-panel hidden></div>
      </div>
    </div>`;
  const wrap = mountSheet('언제 여행하세요?', body, { footer });
  wrap.querySelector('.sheet').classList.add('sheet-date');
  const $ = (s) => wrap.querySelector(s);
  const minYM = today.slice(0, 7), maxYM = max.slice(0, 7);
  const ymOf = (y, m) => `${y}-${String(m + 1).padStart(2, '0')}`;

  const clampView = () => {
    const k = ymOf(view.getFullYear(), view.getMonth());
    if (k < minYM) view = parse(minYM + '-01');
    if (k > maxYM) view = parse(maxYM + '-01');
  };

  const renderPick = () => {
    const panel = $('[data-panel]');
    panel.hidden = !pick;
    wrap.querySelector('.cal').classList.toggle('picking', !!pick);
    $('[data-pick="y"]').classList.toggle('on', pick === 'y');
    $('[data-pick="m"]').classList.toggle('on', pick === 'm');
    if (!pick) return;
    if (pick === 'y') {
      const y0 = +today.slice(0, 4), y1 = +max.slice(0, 4), cur = view.getFullYear();
      let html = '<p class="pick-cap">몇 년에 떠나세요?</p><div class="pick-years">';
      for (let y = y0; y <= y1; y++) html += `<button type="button" class="ema${y === cur ? ' on' : ''}" data-yv="${y}"><span class="ema-hole"></span><b>${y}</b><small>${y === y0 ? '올해' : y === y0 + 1 ? '내년' : '내후년'}</small></button>`;
      panel.innerHTML = html + '</div>';
    } else {
      const y = view.getFullYear(), cur = view.getMonth();
      let html = `<p class="pick-cap">${y}년, 몇 월에 떠나세요?</p><div class="pick-months">`;
      for (let m = 0; m < 12; m++) {
        const k = ymOf(y, m), off = k < minYM || k > maxYM;
        html += `<button type="button" class="mon${m === cur ? ' on' : ''}" data-mv="${m}"${off ? ' disabled' : ''}><span class="mon-ic">${SEASON[m]}</span><b>${m + 1}월</b><small>${WAFU[m]}</small></button>`;
      }
      panel.innerHTML = html + '</div>';
    }
    panel.animate([{ opacity: 0, transform: 'translateY(8px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'ease-out' });
  };

  const render = () => {
    $('[data-y]').textContent = view.getFullYear();
    $('[data-m]').textContent = view.getMonth() + 1;
    $('[data-wafu]').textContent = WAFU[view.getMonth()];
    const first = new Date(view);
    const lead = first.getDay();
    const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    let html = '<span></span>'.repeat(lead);
    for (let d = 1; d <= days; d++) {
      const s = ymd(new Date(view.getFullYear(), view.getMonth(), d));
      const dow = (lead + d - 1) % 7;
      const off = s < today || s > max;
      const cls = ['day',
        dow === 0 ? 'sun' : dow === 6 ? 'sat' : '',
        s === today ? 'today' : '',
        s === start ? 'start' : '', s === end ? 'end' : '',
        start && end && s > start && s < end ? 'in' : '',
      ].filter(Boolean).join(' ');
      html += `<button type="button" class="${cls}" data-d="${s}"${off ? ' disabled' : ''}>${d}</button>`;
    }
    $('[data-grid]').innerHTML = html;
    const k = ymOf(view.getFullYear(), view.getMonth());
    $('[data-nav="-1"]').disabled = k <= minYM;
    $('[data-nav="1"]').disabled = k >= maxYM;
    const showY = (start && start.slice(0, 4) !== today.slice(0, 4)) || (end && end.slice(0, 4) !== today.slice(0, 4));
    const L = showY ? labelY : label;
    const sum = start === end ? L(start) : `${L(start)} → ${end ? L(end) : '종료일 선택'}`;
    $('[data-sum]').textContent = sum;
    $('[data-ok]').disabled = !end;
  };

  // 달력 좌우로 쓸면 이전/다음 달 (살짝 미끄러지며 넘어감)
  const slide = (step) => {
    if (pick || $(`[data-nav="${step}"]`).disabled) return;
    const g = $('[data-grid]');
    g.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: `translateX(${-step * 36}px)`, opacity: 0 }], { duration: 110, easing: 'ease-in' }).onfinish = () => {
      view.setMonth(view.getMonth() + step); render();
      g.animate([{ transform: `translateX(${step * 36}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 170, easing: 'ease-out' });
    };
  };
  enableHSwipe($('.cal'), { onNext: () => slide(1), onPrev: () => slide(-1) });

  wrap.addEventListener('click', (e) => {
    const pb = e.target.closest('[data-pick]');
    if (pb) { pick = pick === pb.dataset.pick ? null : pb.dataset.pick; renderPick(); return; }
    const yv = e.target.closest('[data-yv]');
    if (yv) { view.setFullYear(+yv.dataset.yv); clampView(); render(); pick = 'm'; renderPick(); return; }  // 연도 고르면 바로 월 고르기로
    const mv = e.target.closest('[data-mv]');
    if (mv) { view.setMonth(+mv.dataset.mv); clampView(); pick = null; render(); renderPick(); return; }
    const nav = e.target.closest('[data-nav]');
    if (nav) { view.setMonth(view.getMonth() + Number(nav.dataset.nav)); pick = null; render(); renderPick(); return; }
    if (e.target.closest('[data-whole]')) {
      const f = ymd(view), l = ymd(new Date(view.getFullYear(), view.getMonth() + 1, 0));
      start = f < today ? today : f; end = l > max ? max : l; picking = 'start'; render(); return;
    }
    const p = e.target.closest('[data-p]');
    if (p) {
      const pr = presets[p.dataset.p];
      start = pr.f; end = pr.t; picking = 'start';
      view = parse(start); view.setDate(1); pick = null; render(); renderPick(); return;
    }
    const day = e.target.closest('[data-d]');
    if (day) {
      const s = day.dataset.d;
      if (picking === 'start' || s < start) { start = s; end = null; picking = 'end'; }
      else { end = s; picking = 'start'; }
      render(); return;
    }
    if (e.target.closest('[data-ok]') && end) {
      onPick({ from: start, to: end });
      closeSheet();
    }
  });
  render();
}
