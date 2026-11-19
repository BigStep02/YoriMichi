// PWA: 서비스 워커 등록 + 홈 화면 설치 안내
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

if (isStandalone) document.documentElement.classList.add('is-app');

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ---- 설치 안내 (홈 화면에서만) ----
const onHome = location.pathname === '/' || location.pathname === '/index.html';
const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua);
const isInApp = /KAKAOTALK|Instagram|FBAN|FBAV|Line\//i.test(ua);
const DISMISS_KEY = 'yorimichi-install-dismissed';

function dismissed() {
  try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}
function rememberDismiss() {
  try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* 저장 못 해도 괜찮음 */ }
}

function showBanner({ text, actionLabel, onAction }) {
  if (document.querySelector('.pwa-banner')) return;
  const el = document.createElement('div');
  el.className = 'pwa-banner';
  el.innerHTML = `
    <img src="/images/icons/icon-192.png" alt="">
    <div class="pwa-text"><strong>YoriMichi 앱으로 쓰기</strong><span>${text}</span></div>
    ${actionLabel ? `<button type="button" class="pwa-action">${actionLabel}</button>` : ''}
    <button type="button" class="pwa-close" aria-label="닫기">×</button>`;
  el.querySelector('.pwa-close').addEventListener('click', () => { rememberDismiss(); el.remove(); });
  if (actionLabel) el.querySelector('.pwa-action').addEventListener('click', () => onAction(el));
  document.body.appendChild(el);
}

if (onHome && !isStandalone && !dismissed()) {
  if (isInApp) {
    showBanner({ text: 'Safari나 Chrome으로 열면 홈 화면에 설치할 수 있어요' });
  } else if (isIOS) {
    showBanner({ text: '아래 공유 버튼 → "홈 화면에 추가"를 눌러 주세요' });
  } else {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      showBanner({
        text: '홈 화면에 설치하면 앱처럼 바로 열려요',
        actionLabel: '설치',
        onAction: async (el) => {
          e.prompt();
          await e.userChoice.catch(() => {});
          el.remove();
        },
      });
    });
  }
}
