// 페이지 전환: 나갈 때 먹빛으로 살짝 어두워지고, 새 페이지는 3D 배경이 준비되면 스르륵 밝아짐
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let done = false;
  const reveal0 = () => { if (done) return; done = true; requestAnimationFrame(() => { root.classList.add('vt-in'); window.__yoriRevealed = true; dispatchEvent(new Event('yori:revealed')); }); };
  // 처음 켤 때만: 다른 페이지 무대까지 미리 만드는 동안(멈칫하는 구간) 막을 유지 → 끝나면 걷음
  let waited = false;
  const reveal = () => {
    if (waited) return; waited = true;
    const wait = () => (window.__yoriWarm ? Promise.race([window.__yoriWarm, new Promise((r) => setTimeout(r, 3500))]) : Promise.resolve());
    setTimeout(() => wait().then(reveal0), 60);
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
