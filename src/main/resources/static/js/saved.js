// 저장(縁帳) 공용: 저장 버튼 HTML · 상태 동기화 · 토글 · 토스트
// - 버튼은 HTML 문자열로 넣고, 그린 뒤 syncSave(root)로 클릭 연결 + 저장 상태 표시
//   (router가 페이지를 떠날 때 document 리스너를 정리하므로 위임 대신 버튼마다 연결)
// - 키: F:{festivalId} · S:{spotId} · R:{placeId} · C:{칸들} — 서버 ref_key와 같은 규칙
// - 맛집은 place_id만 저장 (구글 장소 정보 장기 저장 금지). 화면은 우리 데이터로만
import { api, getToken } from './api.js';
import { esc } from './icons.js';
import { isMock } from './mock.js';

/** お守り 아이콘 (저장 표시) */
export const OMAMORI = '<svg class="omamori" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6v2.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/><circle cx="12" cy="4.6" r="1.3" fill="none" stroke="currentColor" stroke-width="1.2"/><path class="om-body" d="M7 8.2 12 5.8l5 2.4v12.1c0 .9-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.6-1.5-1.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.3 11.2h5.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M12 13v5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>';

export const isLoggedIn = () => !!getToken();

// ── 키 ──
export const festKey = (id) => `F:${id}`;
export const spotKey = (id) => `S:${id}`;
export const restKey = (placeId) => `R:${placeId}`;
const STOP_CH = { SPOT: 'S', FESTIVAL: 'F', RESTAURANT: 'R', PLACE: 'P' };
export function courseKey(stops) {
  return 'C:' + stops.map(s => `${STOP_CH[s.type]}:${s.id ?? s.placeId}`).join('|');
}

// ── 저장 키 목록 (토큰별로 한 번만 불러옴) ──
let keys = null;
let keysToken = null;
let keysReq = null;

async function loadKeys() {
  const token = getToken();
  if (!token) { keys = null; keysToken = null; return new Set(); }
  if (keys && keysToken === token) return keys;
  if (keysReq && keysToken === token) return keysReq;
  keysToken = token;
  keysReq = api('/api/saved/keys')
    .then(list => (keys = new Set(list || [])))
    .catch(() => (keys = null, new Set()))
    .finally(() => { keysReq = null; });
  return keysReq;
}

/** 저장 버튼 HTML. variant: 'pill'(시트 위 작은 알약) · 'ghost'(상세 페이지 줄 버튼) · 'ico'(코스 카드 아이콘) · 'mini'(목록 줄 오른쪽) */
export function saveButton(key, body, variant = 'pill') {
  if (!key || isMock()) return '';
  const cls = variant === 'ghost' ? 'btn-ghost save-btn save-ghost'
    : variant === 'ico' ? 'dp-ico save-btn save-ico'
    : variant === 'mini' ? 'save-btn save-mini' : 'save-btn save-pill';
  return `<button type="button" class="${cls}" data-save-key="${esc(key)}" data-save-body="${esc(JSON.stringify(body))}" aria-pressed="false" aria-label="저장" title="저장">${OMAMORI}${variant === 'ico' || variant === 'mini' ? '' : '<span class="save-tx">저장</span>'}</button>`;
}

function paint(btn, on) {
  btn.setAttribute('aria-pressed', String(on));
  btn.setAttribute('aria-label', on ? '저장됨 · 누르면 해제' : '저장');
  btn.title = on ? '저장됨' : '저장';
  const tx = btn.querySelector('.save-tx');
  if (tx) tx.textContent = on ? '저장됨' : '저장';
}

function paintAll(key, on) {
  document.querySelectorAll('[data-save-key]').forEach(b => { if (b.dataset.saveKey === key) paint(b, on); });
}

/** root 안 저장 버튼에 클릭 연결 + 현재 상태 표시. 그릴 때마다 불러도 됨 */
export async function syncSave(root = document) {
  const btns = [...root.querySelectorAll('[data-save-key]')];
  if (!btns.length) return;
  btns.forEach(b => {
    if (b.dataset.saveBound) return;
    b.dataset.saveBound = '1';
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggle(b); });
  });
  const set = await loadKeys();
  btns.forEach(b => paint(b, set.has(b.dataset.saveKey)));
}

async function toggle(btn) {
  const key = btn.dataset.saveKey;
  if (!isLoggedIn()) {
    toast('로그인하면 저장할 수 있어요', { href: `/login.html?next=${encodeURIComponent(location.pathname + location.search)}`, label: '로그인' });
    return;
  }
  if (btn.dataset.busy) return;
  btn.dataset.busy = '1';
  const set = await loadKeys();
  const was = set.has(key);
  // 먼저 바꿔 보여주고, 실패하면 되돌림
  was ? set.delete(key) : set.add(key);
  paintAll(key, !was);
  if (!was) pop(btn);
  try {
    if (was) {
      await api(`/api/saved?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
      toast('저장을 해제했어요');
      // 저장함 화면이 열려 있으면 그 카드를 바로 지우게 알림 (새로고침 없이)
      document.dispatchEvent(new CustomEvent('yori:saved-change', { detail: { key, on: false } }));
    } else {
      await api('/api/saved', { method: 'POST', body: JSON.parse(btn.dataset.saveBody || '{}') });
      toast('縁帳에 저장했어요', { href: '/saved.html', label: '저장함' });
    }
  } catch (err) {
    was ? set.add(key) : set.delete(key);
    paintAll(key, was);
    if (err.status === 401) toast('로그인이 풀렸어요. 다시 로그인해 주세요', { href: '/login.html', label: '로그인' });
    else toast(err.message || '저장하지 못했어요');
  } finally {
    delete btn.dataset.busy;
  }
}

/** 저장 순간 작은 불빛 */
function pop(btn) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  btn.classList.remove('save-pop');
  void btn.offsetWidth;
  btn.classList.add('save-pop');
}

// ── 토스트 ──
let toastTimer = 0;
export function toast(message, action) {
  document.querySelector('.save-toast')?.remove();
  clearTimeout(toastTimer);
  const el = document.createElement('div');
  el.className = 'save-toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<a href="${esc(action.href)}">${esc(action.label)}</a>` : ''}`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  toastTimer = setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 300); }, 2600);
}
