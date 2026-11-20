// 홈: 지역·날짜 바 + 축제 링크 + 곧 열리는 근처 축제 2개
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { todayTokyo, addDays, dDayLabel } from './dates.js';
import { icons, esc } from './icons.js';
import { createHanabiStage, webglAvailable } from './hanabi/hanabi-stage.js';

renderHeader();
initNightStreet();

// 페이지 전환 막이 걷힌 뒤 실행 (transition.js), 없으면 1.2초 뒤
function onRevealed(fn) {
  if (window.__yoriRevealed) { fn(); return; }
  let ran = false; const go = () => { if (!ran) { ran = true; fn(); } };
  addEventListener('yori:revealed', go, { once: true }); setTimeout(go, 1200);
}

// ---------- 3D 축제 거리 배경 ----------
function initNightStreet() {
  // 홈 레이아웃은 항상 밤 테마. 3D는 WebGL 되는 기기에서만
  document.body.classList.add('hanabi-home');
  const header = document.getElementById('app-header');
  let stage = null;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (stage && max > 0) stage.setScroll(scrollY / max);   // 스크롤하면 카메라가 거리 안으로
    header?.classList.toggle('scrolled', scrollY > 20);
  };
  addEventListener('scroll', onScroll, { passive: true });

  const gsap = window.gsap;
  if (gsap) {
    // 첫 화면 문구는 차례로, 아래 카드는 보일 때 하나씩
    // 화면이 밝아진 뒤에 차례로 올라오게 (전환 중에 반쯤 진행된 채로 보이지 않게)
    gsap.set('.hanabi-home .rise', { opacity: 0, y: 24 });
    onRevealed(() => gsap.to('.hanabi-home .rise', { opacity: 1, y: 0, duration: .9, stagger: .1, ease: 'power3.out', delay: .1 }));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        gsap.to(e.target, { opacity: 1, y: 0, duration: .8, ease: 'power3.out' });
        io.unobserve(e.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('.hanabi-home .reveal').forEach((el) => { gsap.set(el, { opacity: 0, y: 36 }); io.observe(el); });
  }

  if (!webglAvailable() || !gsap) return;
  // 동작 줄이기 켜진 기기 → 차분한 모드 (3D는 보이고, 카메라 흔들림·스크롤 이동·진동만 끔)
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 페이지 내용을 먼저 그리고, 3D는 그다음 프레임에 준비 (전환 중 멈춤 방지)
  requestAnimationFrame(() => setTimeout(() => {
    try {
      stage = createHanabiStage(document.getElementById('hanabi-stage'), { calm });
    } catch (e) {
      console.warn('3D 배경을 켤 수 없어요', e);
      return;
    }
    stage.ambient(true);                                  // 멀리서 풍등이 계속 떠오름
    onRevealed(() => setTimeout(() => stage.introGlyph('寄り道'), 700));    // 하늘에 불꽃 글자 (화면이 밝아진 뒤)
    onScroll();
  }, 0));
}

const ICON_CLASS = { dice: 'icon icon-lg', fork: 'icon cat-icon', lantern: 'icon cat-icon', arrowRight: 'icon' };
document.querySelectorAll('[data-icon]').forEach(el => {
  const name = el.dataset.icon;
  const wrapCls = el.className;
  const svg = icons[name](ICON_CLASS[name] || 'icon');
  if (wrapCls) el.innerHTML = svg; else el.outerHTML = svg;
});

const festivalLinks = [document.getElementById('festival-link'), document.getElementById('festival-all')];
const upcomingEl = document.getElementById('upcoming');

const UPCOMING_RADIUS_KM = 50;
const UPCOMING_DAYS = 90;
let seq = 0;

function updateLinks({ from, to }) {
  const href = `/festivals.html?${new URLSearchParams({ from, to })}`;
  festivalLinks.forEach(a => { a.href = href; });
}

function row(f, i) {
  const [, m, d] = f.startDate.split('-').map(Number);
  const badge = f.ongoing || f.dDay >= 0
    ? `<span class="mini-badge">${dDayLabel(f.dDay, f.ongoing)}</span>` : '';
  return `
    <a class="next-card${i % 2 ? ' alt' : ''}" href="/festival.html?id=${encodeURIComponent(f.id)}">
      <div class="date-box"><div class="m">${m}월</div><div class="d">${d}</div></div>
      <div class="info">
        <div class="t">${esc(f.name)}</div>
        ${f.nameJa ? `<div class="ja" lang="ja">${esc(f.nameJa)}</div>` : ''}
        <div class="meta">${badge}${esc(f.city || f.prefecture || '')} · ${Number(f.distanceKm).toFixed(1)}km</div>
      </div>
      ${icons.chevronRight()}
    </a>`;
}

async function loadUpcoming(loc) {
  const mySeq = ++seq;
  upcomingEl.innerHTML = '<div class="next-card skeleton-row" aria-hidden="true"></div>';
  const from = todayTokyo();
  const q = new URLSearchParams({
    lat: loc.lat.toFixed(6), lng: loc.lng.toFixed(6),
    radiusKm: UPCOMING_RADIUS_KM, from, to: addDays(from, UPCOMING_DAYS),
  });
  try {
    const data = await api(`/api/festivals?${q}`);
    if (mySeq !== seq) return;
    const list = (data.festivals || [])
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.distanceKm - b.distanceKm)
      .slice(0, 2);
    upcomingEl.innerHTML = list.length
      ? list.map(row).join('')
      : '<p class="muted empty-line">근처에 곧 열리는 축제가 없어요. 위치를 바꿔 보세요.</p>';
  } catch (e) {
    if (mySeq !== seq) return;
    upcomingEl.innerHTML = `<p class="muted empty-line">${esc(e.message)}</p>`;
  }
}

let lastLocKey = '';
const bar = mountSearchBar(document.getElementById('search-bar'), (state) => {
  updateLinks(state);
  const key = `${state.loc.lat},${state.loc.lng}`;
  if (key !== lastLocKey) { // 날짜만 바뀌면 다시 안 불러옴 (곧 열리는 축제는 오늘 기준)
    lastLocKey = key;
    loadUpcoming(state.loc);
  }
});
updateLinks(bar.state); // 위치 확인 전에도 날짜는 링크에 반영
