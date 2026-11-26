// [임시 진단] 홈 화면 앱(아이폰) 또는 주소에 ?diag=1 → 7초 뒤 화면 아래에 3D·오류 상태를 띄움 (원인 찾으면 지울 것)
(() => {
  const app = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (!app && !/[?&]diag=1/.test(location.search)) return;
  const log = [];
  const add = (k, m) => { if (log.length < 14) log.push(`${k}: ${String(m).slice(0, 160)}`); };
  addEventListener('error', (e) => add('ERR', `${e.message} @${(e.filename || '').split('/').pop()}:${e.lineno}`), true);
  addEventListener('error', (e) => { const t = e.target; if (t && t !== window && (t.src || t.href)) add('LOAD', t.src || t.href); }, true);
  addEventListener('unhandledrejection', (e) => add('REJ', e.reason?.message || e.reason));
  for (const k of ['warn', 'error']) { const o = console[k].bind(console); console[k] = (...a) => { add(k.toUpperCase(), a.map((x) => x?.message || x).join(' ')); o(...a); }; }
  const gl = (() => { try { const c = document.createElement('canvas'); const g = c.getContext('webgl2') || c.getContext('webgl'); if (!g) return 'NONE'; const r = `${g instanceof WebGL2RenderingContext ? 'gl2' : 'gl1'} max${g.getParameter(g.MAX_TEXTURE_SIZE)} par${!!g.getExtension('KHR_parallel_shader_compile')}`; g.getExtension('WEBGL_lose_context')?.loseContext(); return r; } catch (e) { return 'ERR ' + e.message; } })();
  setTimeout(() => {
    const c = document.getElementById('hanabi-stage');
    const cs = c && getComputedStyle(c);
    const info = [
      `app=${app} dpr=${devicePixelRatio} ${innerWidth}x${innerHeight} gl=${gl}`,
      `canvas=${c ? `${c.className || '(no class)'} ${c.width}x${c.height} op=${cs.opacity} disp=${cs.display}` : 'NONE'} body=${document.body.className}`,
      `revealed=${!!window.__yoriRevealed} html=${document.documentElement.className}`,
      ...log,
    ];
    const box = document.createElement('pre');
    box.textContent = info.join('\n');
    box.style.cssText = 'position:fixed;left:6px;right:6px;bottom:calc(6px + env(safe-area-inset-bottom));z-index:2147483647;margin:0;padding:8px;max-height:45vh;overflow:auto;background:rgba(0,0,0,.85);color:#7CFC9A;font:11px/1.35 ui-monospace,monospace;white-space:pre-wrap;word-break:break-all;border:1px solid #7CFC9A;border-radius:8px';
    box.addEventListener('click', () => box.remove());
    document.body.appendChild(box);
  }, 7000);
})();
// 페이지 전환: 나갈 때 먹빛으로 살짝 어두워지고, 새 페이지는 3D 배경이 준비되면 스르륵 밝아짐
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let done = false;
  const reveal0 = () => { if (done) return; done = true; requestAnimationFrame(() => { root.classList.add('vt-in'); window.__yoriRevealed = true; dispatchEvent(new Event('yori:revealed')); }); };
  // 첫 무대가 그려지면 바로 걷음. 다른 페이지 무대는 이제 한가할 때 하나씩 미리 만들어서(hanabi-stage.js prewarm) 기다릴 필요 없음
  let waited = false;
  const reveal = () => {
    if (waited) return; waited = true;
    setTimeout(reveal0, 60);
  };
  const c = document.getElementById('hanabi-stage');
  if (c && !c.classList.contains('ready')) {
    new MutationObserver((_, o) => { if (c.classList.contains('ready')) { o.disconnect(); reveal(); } })
      .observe(c, { attributes: true, attributeFilter: ['class'] });
    setTimeout(reveal, 1500);   // 3D가 늦어도 화면은 먼저 보여줌
  } else reveal();

  addEventListener('pageshow', (e) => { if (e.persisted) { root.classList.remove('vt-out'); root.classList.add('vt-in'); } });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    e.preventDefault();
    // 방금 홈에서 왔으면 새로 불러오지 말고 '뒤로 가기' → 브라우저가 보관해둔 홈 화면을 그대로 꺼내서 즉시 복귀 (3D 다시 안 만듦)
    try {
      const ref = document.referrer && new URL(document.referrer);
      if (ref && ref.origin === location.origin && ref.pathname === url.pathname && ref.search === url.search && history.length > 1) {
        root.classList.add('vt-out');
        setTimeout(() => history.back(), 160);
        return;
      }
    } catch { /* 그냥 이동 */ }
    root.classList.add('vt-out');
    setTimeout(() => { location.href = url.href; }, 220);
  });
})();
