// 페이지 전환: 나갈 때 먹빛으로 살짝 어두워지고, 새 페이지는 3D 배경이 준비되면 스르륵 밝아짐
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let done = false;
  const reveal = () => { if (done) return; done = true; requestAnimationFrame(() => root.classList.add('vt-in')); };
  const c = document.getElementById('hanabi-stage');
  if (c && !c.classList.contains('ready')) {
    new MutationObserver((_, o) => { if (c.classList.contains('ready')) { o.disconnect(); reveal(); } })
      .observe(c, { attributes: true, attributeFilter: ['class'] });
    setTimeout(reveal, 900);   // 3D가 늦어도 화면은 먼저 보여줌
  } else reveal();

  addEventListener('pageshow', (e) => { if (e.persisted) { root.classList.remove('vt-out'); root.classList.add('vt-in'); } });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    e.preventDefault();
    root.classList.add('vt-out');
    setTimeout(() => { location.href = url.href; }, reduce ? 0 : 220);
  });
})();
