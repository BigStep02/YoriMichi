// mock(가짜 데이터, 구글 호출 0회) 켜기/끄기
// - 주소에 ?mock=1 → 이 탭에서 유지 (?mock=0 이나 탭 닫으면 해제)
// - 로고(YoriMichi)를 2.5초 안에 5번 탭 → 이 기기에 계속 유지 (홈 화면에 추가한 앱용). 다시 5번 탭하면 해제
// - 켜져 있으면 왼쪽 아래 'MOCK · 끄기' 표시
const KEY = 'yori-mock';          // sessionStorage: 탭 단위
const KEY_DEVICE = 'yori-mock-app'; // localStorage: 기기 단위
const KEY_DEV = 'yori-dev';          // 로그인한 계정이 개발자면 '1' (header.js가 /api/users/me 응답으로 갱신)

/** 개발자 계정 여부 저장. 개발자가 아니게 되면 mock도 같이 끔 */
export function setDev(on) {
  try {
    if (on) {
      const was = localStorage.getItem(KEY_DEV) === '1';
      localStorage.setItem(KEY_DEV, '1');
      // 개발자 확인 전에 ?mock=1 로 들어왔으면, 확인된 순간 한 번 새로 불러와서 바로 mock 적용
      if (!was && new URLSearchParams(location.search).get('mock') === '1') location.reload();
    }
    else { localStorage.removeItem(KEY_DEV); localStorage.removeItem(KEY_DEVICE); sessionStorage.removeItem(KEY); document.getElementById('mock-badge')?.remove(); }
  } catch {}
}
function isDev() {
  try { return localStorage.getItem(KEY_DEV) === '1' && !!localStorage.getItem('token'); } catch { return false; }
}

export function isMock() {
  if (!isDev()) return false;   // 개발자 계정으로 로그인했을 때만
  const p = new URLSearchParams(location.search).get('mock');
  try {
    if (p === '1') sessionStorage.setItem(KEY, '1');
    else if (p === '0') { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY_DEVICE); document.getElementById('mock-badge')?.remove(); }
    return sessionStorage.getItem(KEY) === '1' || localStorage.getItem(KEY_DEVICE) === '1';
  } catch { return p === '1'; }
}

function setDevice(on) {
  try {
    if (on) localStorage.setItem(KEY_DEVICE, '1');
    else { localStorage.removeItem(KEY_DEVICE); sessionStorage.removeItem(KEY); }
  } catch {}
}

// 켜져 있으면 화면 구석에 작은 표시 (실제 데이터랑 헷갈리지 않게)
if (isMock() && !document.getElementById('mock-badge')) {
  const b = document.createElement('a');
  b.id = 'mock-badge'; b.href = location.pathname + '?mock=0'; b.target = '_top';   // 새로 불러와서 확실히 끔
  b.textContent = 'MOCK · 끄기';
  b.style.cssText = 'position:fixed;left:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:9999;font:700 11px/1 sans-serif;padding:6px 9px;border-radius:999px;background:#F2C14E;color:#1A0A05;text-decoration:none;opacity:.85';
  document.documentElement.appendChild(b);
}

// 로고 5번 탭 → 토글 (router.js가 document 캡처에서 링크를 가로채므로 window 캡처에서 먼저 받음)
let taps = 0, first = 0;
window.addEventListener('click', (e) => {
  if (!e.target.closest?.('.brand') || !isDev()) return;
  const now = Date.now();
  if (now - first > 2500) { taps = 0; first = now; }
  if (++taps < 5) return;
  taps = 0;
  e.preventDefault(); e.stopPropagation();
  const on = !isMock();
  setDevice(on);
  location.href = location.pathname + (on ? '' : '?mock=0');
}, true);
