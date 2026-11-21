// 스와이프: 시트 쓸어내려 닫기 · 좌우로 넘기기 · 화면 왼쪽 끝에서 뒤로 가기(홈 화면 앱)
// 세로 스크롤과 헷갈리지 않게 처음 10px 움직임으로 방향을 정하고, 정해진 방향만 처리한다.

const LOCK = 10;

/** 좌우 스와이프. onNext = 왼쪽으로 쓸기, onPrev = 오른쪽으로 쓸기 */
export function enableHSwipe(el, { onNext, onPrev, threshold = 48, follow = false } = {}) {
  if (!el || el.dataset.hswipe) return;
  el.dataset.hswipe = '1';
  el.style.touchAction = 'pan-y';
  let x0 = 0, y0 = 0, t0 = 0, dir = null, id = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    id = e.pointerId; x0 = e.clientX; y0 = e.clientY; t0 = performance.now(); dir = null;
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (!dir && Math.hypot(dx, dy) > LOCK) dir = Math.abs(dx) > Math.abs(dy) * 1.4 ? 'h' : 'v';
    if (dir === 'h' && follow) { el.style.transition = 'none'; el.style.transform = `translateX(${dx * .35}px)`; }
  });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    const dx = e.clientX - x0, v = Math.abs(dx) / Math.max(1, performance.now() - t0);
    if (follow) { el.style.transition = 'transform .25s ease'; el.style.transform = ''; }
    if (dir !== 'h') return;
    if (Math.abs(dx) < threshold && v < .45) return;
    // 스와이프 뒤에 따라오는 click은 막음 (버튼 위에서 쓸어도 눌리지 않게)
    if (dx < 0) onNext?.(); else onPrev?.();   // 먼저 실행 (안에서 부르는 .click()이 막히지 않게)
    const stop = (ev) => { if (!ev.isTrusted) return; ev.stopPropagation(); ev.preventDefault(); };
    el.addEventListener('click', stop, { capture: true, once: true });
    setTimeout(() => el.removeEventListener('click', stop, { capture: true }), 350);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', (e) => { if (e.pointerId === id) { id = null; if (follow) el.style.transform = ''; } });
}

/** 아래에서 올라온 시트를 쓸어내려 닫기. 손가락 따라 시트가 같이 내려온다. */
export function enableSheetSwipe(wrap, close) {
  const sheet = wrap.querySelector('.sheet'), dim = wrap.querySelector('.sheet-dim');
  const body = wrap.querySelector('.sheet-body');
  if (!sheet) return;
  wrap.querySelectorAll('.sheet-grip, .sheet-head').forEach((h) => { h.style.touchAction = 'none'; });
  let y0 = 0, x0 = 0, t0 = 0, dy = 0, active = false, dir = null, id = null, fromBody = false;
  sheet.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('input, textarea, select')) return;
    fromBody = !!body && body.contains(e.target);
    if (fromBody && body.scrollTop > 0) return;            // 내용이 스크롤된 상태면 스크롤 우선
    id = e.pointerId; y0 = e.clientY; x0 = e.clientX; t0 = performance.now(); dy = 0; dir = null; active = true;
  });
  sheet.addEventListener('pointermove', (e) => {
    if (!active || e.pointerId !== id) return;
    const ddy = e.clientY - y0, ddx = e.clientX - x0;
    if (!dir && Math.hypot(ddx, ddy) > LOCK) dir = ddy > 0 && Math.abs(ddy) > Math.abs(ddx) ? 'down' : 'other';
    if (dir !== 'down') { if (dir) active = false; return; }
    if (fromBody && body.scrollTop > 0) { active = false; sheet.style.transform = ''; return; }
    if (fromBody) e.preventDefault();
    dy = Math.max(0, ddy);
    sheet.style.transition = 'none';
    sheet.style.transform = `translateY(${dy}px)`;
    if (dim) dim.style.opacity = String(Math.max(0, 1 - dy / 420));
  }, { passive: false });
  const end = (e) => {
    if (!active || e.pointerId !== id) return;
    active = false; id = null;
    if (dir !== 'down') return;
    const v = dy / Math.max(1, performance.now() - t0);
    sheet.style.transition = 'transform .24s cubic-bezier(.2,.8,.2,1)';
    if (dim) dim.style.transition = 'opacity .24s';
    if (dy > Math.min(140, sheet.offsetHeight * .25) || v > .6) {
      sheet.style.transform = 'translateY(105%)'; if (dim) dim.style.opacity = '0';
      setTimeout(close, 180);
    } else {
      sheet.style.transform = ''; if (dim) dim.style.opacity = '';
    }
  };
  sheet.addEventListener('pointerup', end);
  sheet.addEventListener('pointercancel', end);
}

/** 한 개만 고르는 버튼 묶음(.seg, 라디오 칩)을 좌우로 쓸어서 옆 항목 고르기 */
export function enableGroupSwipe(root = document) {
  root.querySelectorAll('.seg, .chips[role="radiogroup"]').forEach((g) => {
    const pick = (step) => {
      const btns = [...g.querySelectorAll('button')];
      const i = btns.findIndex((b) => b.getAttribute('aria-checked') === 'true');
      const next = btns[Math.min(btns.length - 1, Math.max(0, (i < 0 ? 0 : i) + step))];
      if (next && next !== btns[i]) next.click();
    };
    enableHSwipe(g, { onNext: () => pick(1), onPrev: () => pick(-1), threshold: 36 });
  });
}

// 홈 화면에 추가한 앱(standalone)에는 브라우저 뒤로 가기 제스처가 없어서 직접 넣음
function edgeBack() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (!standalone || location.pathname === '/' || location.pathname === '/index.html') return;
  let x0 = 0, y0 = 0, id = null;
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && e.clientX < 24) { id = e.pointerId; x0 = e.clientX; y0 = e.clientY; } });
  addEventListener('pointerup', (e) => {
    if (e.pointerId !== id) return; id = null;
    const dx = e.clientX - x0, dy = Math.abs(e.clientY - y0);
    if (dx > 80 && dy < 60) {
      const back = document.getElementById('back-link');
      if (back) back.click(); else history.back();
    }
  });
}

edgeBack();
// 앱처럼 페이지를 옮긴 뒤(router.js)에도 새 화면에 다시 연결
(window.__spaAddPersistent || ((t, ...a) => t.addEventListener(...a)))(document, 'spa:enter', () => edgeBack());
