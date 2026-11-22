// 앱처럼 페이지 이동: 3D 배경(canvas)은 그대로 두고 내용만 바꿔 끼움 → 3D를 다시 만들지 않아서 끊기지 않음
// 실패하면 언제든 평소처럼 페이지를 새로 불러옴.
import './mock.js';   // ?mock=1 을 어느 페이지에서 들어와도 기억하고 MOCK 표시
const PAGES = new Set(['/', '/index.html', '/draw.html', '/festivals.html', '/festival.html', '/restaurants.html', '/spots.html', '/login.html']);
const SKIP_SCRIPTS = /\/js\/(router|pwa)\.js$/;   // 한 번만 실행하면 되는 것

// ── 페이지마다 붙인 window/document 이벤트·반복 타이머를 기록해 두었다가 떠날 때 정리 ──
const origAdd = EventTarget.prototype.addEventListener;
const origInterval = window.setInterval.bind(window);
let bag = { listeners: [], intervals: [] };
window.__spaAddPersistent = (t, ...a) => origAdd.apply(t, a);   // 페이지를 넘어 계속 살아야 하는 것(무대 보관함 등)
EventTarget.prototype.addEventListener = function (type, fn, opt) {
  if (bag && (this === window || this === document)) bag.listeners.push([this, type, fn, opt]);
  return origAdd.call(this, type, fn, opt);
};
window.setInterval = (fn, ms, ...a) => { const id = origInterval(fn, ms, ...a); bag?.intervals.push(id); return id; };
function cleanup() {
  for (const [t, type, fn, opt] of bag.listeners) t.removeEventListener(type, fn, opt);
  for (const id of bag.intervals) clearInterval(id);
  bag = { listeners: [], intervals: [] };
}

const supported = 'fetch' in window && 'DOMParser' in window && history.pushState;
let seq = 0, busy = null;
const persist = (fn) => { const b = bag; bag = null; try { fn(); } finally { bag = b; } };

if (supported) persist(() => {
  history.scrollRestoration = 'manual';
  history.replaceState({ spa: true, y: 0 }, '');
  document.addEventListener('click', onClick, true);
  window.addEventListener('popstate', (e) => { if (e.state?.spa) go(location.href, { push: false, y: e.state.y || 0 }); else location.reload(); });
});

function onClick(e) {
  const a = e.target.closest('a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !PAGES.has(url.pathname)) return;
  if (url.pathname === location.pathname && url.search === location.search) { e.preventDefault(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
  e.preventDefault();
  go(url.href, { push: true });
}

// 장면이 바뀌는 순간을 먹빛으로 살짝 덮는 막 (html 바로 아래라 내용을 바꿔도 남아 있음)
const veil = document.createElement('div');
veil.id = 'spa-veil';
document.documentElement.appendChild(veil);
const stageMod = import('./hanabi/hanabi-stage.js');
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

async function go(href, { push, y = 0 }) {
  const my = ++seq;
  const out = document.body.classList;
  try {
    out.add('spa-out');
    stageMod.then((m) => m.leaveStage()).catch(() => {});
    setTimeout(() => veil.classList.add('on'), 90);
    const [html] = await Promise.all([
      fetch(href, { credentials: 'same-origin' }).then((r) => { if (!r.ok || !/html/.test(r.headers.get('content-type') || '')) throw 0; return r.text(); }),
      new Promise((r) => setTimeout(r, 330)),
    ]);
    if (my !== seq) return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (push) { history.replaceState({ spa: true, y: scrollY }, ''); history.pushState({ spa: true, y: 0 }, '', href); }
    window.__spaPrev = window.__spaCur || document.referrer; window.__spaCur = href;
    swap(doc);
    scrollTo(0, y);
    await runScripts(doc, my);
    document.dispatchEvent(new Event('spa:enter'));
    await nextFrame();
    veil.classList.remove('on');
    document.body.classList.remove('spa-out');
  } catch (err) {
    veil.classList.remove('on');
    if (my === seq) location.href = href;   // 문제 생기면 평소대로
  }
}

function swap(doc) {
  cleanup();
  document.dispatchEvent(new Event('spa:leave'));
  document.title = doc.title;
  const canvas = document.getElementById('hanabi-stage');
  const nextCanvas = doc.getElementById('hanabi-stage');
  // body 속성 교체 (클래스·data-page)
  for (const at of [...document.body.attributes]) document.body.removeAttribute(at.name);
  for (const at of doc.body.attributes) document.body.setAttribute(at.name, at.value);
  document.body.classList.add('spa-out');
  // 내용 교체: canvas는 살려두고 나머지만
  for (const n of [...document.body.childNodes]) if (n !== canvas) n.remove();
  for (const n of [...doc.body.childNodes]) {
    if (n.nodeName === 'SCRIPT') continue;
    if (n === nextCanvas && canvas) {
      for (const k of Object.keys(canvas.dataset)) delete canvas.dataset[k];
      Object.assign(canvas.dataset, nextCanvas.dataset);
      canvas.style.display = '';
      document.body.appendChild(canvas);
      continue;
    }
    document.body.appendChild(document.adoptNode(n));
  }
  if (canvas && !nextCanvas) { canvas.style.display = 'none'; import('./hanabi/hanabi-stage.js').then((m) => m.pauseStages()); }
}

async function runScripts(doc, my) {
  const srcs = [...doc.querySelectorAll('script[type="module"][src]')].map((s) => s.getAttribute('src')).filter((s) => !SKIP_SCRIPTS.test(s));
  for (const src of srcs) {
    if (my !== seq) return;
    await import(`${src}${src.includes('?') ? '&' : '?'}spa=${my}`);   // 페이지 스크립트를 새로 실행
  }
}
