// ?mock=1 로 한 번 들어가면 이 탭에서는 계속 가짜 데이터(구글 호출 0회). ?mock=0 이나 탭을 닫으면 해제
const KEY = 'yori-mock';
export function isMock() {
  const p = new URLSearchParams(location.search).get('mock');
  try {
    if (p === '1') sessionStorage.setItem(KEY, '1');
    else if (p === '0') { sessionStorage.removeItem(KEY); document.getElementById('mock-badge')?.remove(); }
    return sessionStorage.getItem(KEY) === '1';
  } catch { return p === '1'; }
}

// 켜져 있으면 화면 구석에 작은 표시 (실제 데이터랑 헷갈리지 않게)
if (isMock() && !document.getElementById('mock-badge')) {
  const b = document.createElement('a');
  b.id = 'mock-badge'; b.href = location.pathname + '?mock=0'; b.target = '_top';   // 새로 불러와서 확실히 끔 b.textContent = 'MOCK · 끄기';
  b.style.cssText = 'position:fixed;left:10px;bottom:calc(10px + env(safe-area-inset-bottom));z-index:9999;font:700 11px/1 sans-serif;padding:6px 9px;border-radius:999px;background:#F2C14E;color:#1A0A05;text-decoration:none;opacity:.85';
  document.documentElement.appendChild(b);
}
