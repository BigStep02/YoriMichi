// 지역·날짜 바 (홈·축제 목록 공통)
import { TEST_CITIES, getSearchLocation, getLocationMode, getTestCity, setLocationChoice } from './location.js';
import { todayTokyo, addDays, formatRange, isValidYmd } from './dates.js';
import { icons, esc } from './icons.js';

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
      <button type="button" class="chip" data-toggle="loc" aria-expanded="false">
        ${icons.pin()}<span data-loc-label>위치 확인 중…</span>${icons.chevronDown()}
      </button>
      <button type="button" class="chip" data-toggle="date" aria-expanded="false">
        ${icons.calendar()}<span data-date-label></span>
      </button>
    </div>
    <p class="loc-note" data-loc-note hidden></p>
    <div class="panel" data-panel="loc" hidden>
      <label class="field">기준 위치
        <select data-loc-select>
          <option value="geo">현재 위치 (일본 밖이면 테스트 도시)</option>
          ${[...new Set(TEST_CITIES.map(c => c.region))].map(region => `
          <optgroup label="${esc(region)} (테스트)">
            ${TEST_CITIES.filter(c => c.region === region).map(c => `<option value="${c.key}">${esc(c.name)}</option>`).join('')}
          </optgroup>`).join('')}
        </select>
      </label>
    </div>
    <div class="panel" data-panel="date" hidden>
      <div class="date-grid">
        <label class="field">시작일<input type="date" data-from required></label>
        <label class="field">종료일<input type="date" data-to required></label>
      </div>
      <p class="muted panel-hint">축제는 앞으로 열리는 일정만 있어요. 1년 뒤까지 고를 수 있어요.</p>
    </div>`;

  if (!dates) { // 맛집 뽑기처럼 날짜가 필요 없는 화면
    el.querySelector('[data-toggle="date"]').remove();
    el.querySelector('[data-panel="date"]').remove();
    el.classList.add('no-dates');
  }

  const $ = (s) => el.querySelector(s);
  const select = $('[data-loc-select]');
  const fromInput = $('[data-from]');
  const toInput = $('[data-to]');
  select.value = choice;

  const renderDate = () => {
    $('[data-date-label]').textContent = formatRange(state.from, state.to);
    fromInput.value = state.from;
    toInput.value = state.to;
    fromInput.min = todayTokyo(); // 지난 날짜 선택 방지 (DB엔 다음 개최분만 있음)
    fromInput.max = toInput.max = addDays(todayTokyo(), 365); // 1년 뒤까지만 (그 이후 일정은 아직 없음)
    toInput.min = state.from;
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

  el.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = $(`[data-panel="${btn.dataset.toggle}"]`);
      panel.hidden = !panel.hidden;
      btn.setAttribute('aria-expanded', String(!panel.hidden));
    });
  });

  select.addEventListener('change', () => {
    setLocationChoice(select.value);
    resolveLocation();
  });

  const onDateChange = () => {
    let from = fromInput.value;
    let to = toInput.value;
    if (!isValidYmd(from) || !isValidYmd(to)) return;
    const today = todayTokyo();
    const max = addDays(today, 365);
    if (from < today) from = today;
    if (from > max) from = max;
    if (to > max) to = max;
    if (to < from) to = from;
    state.from = from;
    state.to = to;
    saveRange({ from, to });
    renderDate();
    emit();
  };
  if (dates) {
    fromInput.addEventListener('change', onDateChange);
    toInput.addEventListener('change', onDateChange);
    renderDate();
  }
  resolveLocation();

  return {
    get state() { return { ...state }; },
    refresh: emit,
  };
}
