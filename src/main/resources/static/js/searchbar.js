// 지역·날짜 바 (홈·축제 목록 공통)
import { getSearchLocation, getLocationMode, getTestCity, setLocationChoice } from './location.js';
import { todayTokyo, addDays, isValidYmd } from './dates.js';
import { icons } from './icons.js';
import { openLocationSheet, openDateSheet } from './sheet.js';

const RANGE_KEY = 'dateRange';

/** URL → localStorage → 기본(오늘~+7일) 순으로 기간 결정 */
export function initialRange() {
  const params = new URLSearchParams(location.search);
  let from = params.get('from');
  let to = params.get('to');
  if (!isValidYmd(from) || !isValidYmd(to)) {
    try {
      const saved = JSON.parse(localStorage.getItem(RANGE_KEY) || 'null');
      if (saved && isValidYmd(saved.from) && isValidYmd(saved.to)) ({ from, to } = saved);
    } catch { /* noop */ }
  }
  if (!isValidYmd(from) || !isValidYmd(to)) {
    from = todayTokyo();
    to = addDays(from, 7);
  }
  if (from > to) [from, to] = [to, from];
  const today = todayTokyo();
  if (to < today) { from = today; to = addDays(today, 7); } // 저장된 기간이 이미 지났으면 초기화
  else if (from < today) from = today;
  return { from, to };
}

function saveRange(range) {
  try { localStorage.setItem(RANGE_KEY, JSON.stringify(range)); } catch { /* noop */ }
}

/**
 * @param {HTMLElement} el
 * @param {(state: {loc: object, from: string, to: string}) => void} onChange
 */
export function mountSearchBar(el, onChange, { dates = true } = {}) {
  const state = { loc: null, ...initialRange() };
  el.className = 'search-bar';

  const choice = getLocationMode() === 'geo' ? 'geo' : getTestCity().key;
  el.innerHTML = `
    <div class="row">
      <button type="button" class="chip" data-open="loc" aria-haspopup="dialog">
        ${icons.pin()}<span data-loc-label>위치 확인 중…</span>${icons.chevronDown()}
      </button>
      ${dates ? `
      <button type="button" class="chip" data-open="date" aria-haspopup="dialog">
        ${icons.calendar()}<span data-date-label></span>
      </button>` : ''}
    </div>
    <p class="loc-note" data-loc-note hidden></p>`;

  if (!dates) el.classList.add('no-dates'); // 맛집 뽑기처럼 날짜가 필요 없는 화면

  const $ = (s) => el.querySelector(s);
  let locChoice = choice;

  const short = (v) => {
    const [y, m, d] = v.split('-');
    return (y !== todayTokyo().slice(0, 4) ? `${y}.` : '') + `${+m}.${+d}`;
  };
  const renderDate = () => {
    $('[data-date-label]').textContent =
      state.from === state.to ? short(state.from) : `${short(state.from)} – ${short(state.to)}`;
  };

  const emit = () => { if (state.loc) onChange({ ...state }); };

  const resolveLocation = async () => {
    $('[data-loc-label]').textContent = '위치 확인 중…';
    state.loc = await getSearchLocation();
    $('[data-loc-label]').textContent = state.loc.label;
    const note = $('[data-loc-note]');
    note.hidden = !state.loc.reason;
    note.textContent = state.loc.reason || '';
    emit();
  };

  $('[data-open="loc"]').addEventListener('click', () => {
    openLocationSheet(locChoice, (v) => {
      locChoice = v;
      setLocationChoice(v);
      resolveLocation();
    });
  });

  if (dates) {
    $('[data-open="date"]').addEventListener('click', () => {
      openDateSheet({ from: state.from, to: state.to }, ({ from, to }) => {
        state.from = from;
        state.to = to;
        saveRange({ from, to });
        renderDate();
        emit();
      });
    });
    renderDate();
  }
  resolveLocation();

  return {
    get state() { return { ...state }; },
    refresh: emit,
  };
}
