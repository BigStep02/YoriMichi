// 홈: 지역·날짜 바 + 카테고리 칸 + 지금 근처 寄り道(축제 + 영업 중 놀거리 섞어서 3개)
import { api } from './api.js';
import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { todayTokyo, addDays, dDayLabel } from './dates.js';
import { icons, esc } from './icons.js';
import { festRow, spotRow, sortFests, sortSpots } from './nearrows.js';
import { acquireStage, webglAvailable } from './hanabi/hanabi-stage.js';

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
    const riseEls = gsap.utils.toArray('.hanabi-home .rise');   // 지금 잡아둠 (검색 바는 나중에 class가 바뀜)
    gsap.set(riseEls, { opacity: 0, y: 24 });
    onRevealed(() => gsap.to(riseEls, { opacity: 1, y: 0, duration: .9, stagger: .1, ease: 'power3.out', delay: .1 }));
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
      stage = acquireStage(document.getElementById('hanabi-stage'), { calm });
    } catch (e) {
      console.warn('3D 배경을 켤 수 없어요', e);
      return;
    }
    if (!stage.firstVisit) stage.idle();   // 뽑기 화면과 같은 무대를 쓰므로, 뽑기 뒤 카메라·등불을 거리 모습으로 되돌림
    stage.ambient(true);                                  // 멀리서 풍등이 계속 떠오름
    if (stage.firstVisit) onRevealed(() => setTimeout(() => stage.introGlyph('寄り道'), 700));    // 하늘에 불꽃 글자 (화면이 밝아진 뒤)
    onScroll();
  }, 0));
}

const ICON_CLASS = { dice: 'icon icon-lg', fork: 'icon cat-icon', lantern: 'icon cat-icon', map: 'icon cat-icon', arrowRight: 'icon' };
document.querySelectorAll('[data-icon]').forEach(el => {
  const name = el.dataset.icon;
  const wrapCls = el.className;
  const svg = icons[name](ICON_CLASS[name] || 'icon');
  if (wrapCls) el.innerHTML = svg; else el.outerHTML = svg;
});

const festivalLinks = [document.getElementById('festival-link')];
const upcomingEl = document.getElementById('upcoming');

const UPCOMING_RADIUS_KM = 50;
const UPCOMING_DAYS = 0;   // '지금 근처': 오늘 열려 있는 축제만
const SPOT_RADIUS_KM = 10;
const PICKS = 3;          // 칸 수
let spotList = [];
let seq = 0;

function updateLinks({ from, to }) {
  const href = `/festivals.html?${new URLSearchParams({ from, to })}`;
  festivalLinks.forEach(a => { a.href = href; });
}

/** 놀거리: 지금 문 닫은 곳은 빼고, 영업 중 먼저, 종류가 겹치지 않게 가까운 순으로 n개 */
function pickSpots(list, n) {
  const sorted = sortSpots(list.filter(s => s.openNow !== false));
  const out = [], kinds = new Set();
  for (const s of sorted) { if (out.length < n && !kinds.has(s.kind)) { out.push(s); kinds.add(s.kind); } }
  for (const s of sorted) { if (out.length < n && !out.includes(s)) out.push(s); }
  return out;
}

async function loadUpcoming(loc) {
  const mySeq = ++seq;
  upcomingEl.innerHTML = '<div class="next-card skeleton-row" aria-hidden="true"></div>'.repeat(2);
  const from = todayTokyo();
  const lat = loc.lat.toFixed(6), lng = loc.lng.toFixed(6);
  const fq = new URLSearchParams({ lat, lng, radiusKm: UPCOMING_RADIUS_KM, from, to: addDays(from, UPCOMING_DAYS) });
  const sq = new URLSearchParams({ lat, lng, radiusKm: SPOT_RADIUS_KM });
  // 둘 다 자체 DB라 Places 비용 0
  const [fr, sr] = await Promise.allSettled([api(`/api/festivals?${fq}`), api(`/api/spots?${sq}`, { auth: false })]);
  if (mySeq !== seq) return;

  const fests = fr.status === 'fulfilled'
    ? sortFests(fr.value.festivals || [])
    : [];
  const festPick = fests.slice(0, 2);   // 오늘 축제는 최대 2칸, 나머지는 놀거리
  spotList = pickSpots(sr.status === 'fulfilled' ? (sr.value.spots || []) : [], PICKS - festPick.length);

  const rows = [...festPick.map(festRow), ...spotList.map(spotRow)];
  if (rows.length) { upcomingEl.innerHTML = rows.join(''); return; }
  const err = fr.status === 'rejected' && sr.status === 'rejected' ? fr.reason?.message : '';
  upcomingEl.innerHTML = `<p class="muted empty-line">${esc(err || '지금 근처에 문 연 곳이 없어요. 위치를 바꿔 보세요.')}</p>`;
}

let lastLocKey = '';
const bar = mountSearchBar(document.getElementById('search-bar'), (state) => {
  updateLinks(state);
  const key = `${state.loc.lat},${state.loc.lng}`;
  if (key !== lastLocKey) { // 날짜만 바뀌면 다시 안 불러옴 (오늘 기준)
    lastLocKey = key;
    loadUpcoming(state.loc);
  }
});
updateLinks(bar.state); // 위치 확인 전에도 날짜는 링크에 반영
