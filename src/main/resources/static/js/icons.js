// 인라인 SVG 아이콘 (currentColor 사용)
const svg = (body, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

/** 도리이(신사) — 이모지 ⛩ 대신. 색이 들어간 그림이라 currentColor 안 씀 */
export const TORII = '<svg class="torii" viewBox="0 0 24 24" aria-hidden="true"><path d="M1.5 4.4c3.4 1.4 6.9 2 10.5 2s7.1-.6 10.5-2l-.7 2.6c-3.2 1-6.5 1.5-9.8 1.5S5.4 8 2.2 7z" fill="#2A1208"/><path d="M1.7 4.5c3.4 1.3 6.8 1.9 10.3 1.9s6.9-.6 10.3-1.9" fill="none" stroke="#F2C14E" stroke-width=".9" stroke-linecap="round"/><rect x="3.8" y="8.3" width="16.4" height="1.5" rx=".3" fill="#E8462E"/><rect x="11.25" y="9.6" width="1.5" height="2" fill="#E8462E"/><rect x="2.8" y="11.4" width="18.4" height="1.7" rx=".4" fill="#E8462E"/><path d="M5.6 9.6h2.1l.3 10.2H5.3z" fill="#E8462E"/><path d="M16.3 9.6h2.1l.3 10.2h-2.7z" fill="#E8462E"/><rect x="4.7" y="19.4" width="3.8" height="1.8" rx=".4" fill="#2A1208"/><rect x="15.5" y="19.4" width="3.8" height="1.8" rx=".4" fill="#2A1208"/></svg>';

export const icons = {
  torii: () => TORII,
  refresh: (c) => svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>', c),
  pin: (c) => svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', c),
  calendar: (c) => svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', c),
  chevronDown: (c) => svg('<path d="M6 9l6 6 6-6"/>', c),
  back: (c) => svg('<path d="M15 18l-6-6 6-6"/>', c),
  route: (c) => svg('<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/>', c),
  info: (c) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>', c),
  map: (c) => svg('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>', c),
  link: (c) => svg('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', c),
  dice: (c) => svg('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/>', c),
  bowl: (c) => svg('<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1.5 1-2 1-3.5M12 7c0-1.5 1-2 1-3.5M16 7c0-1.5 1-2 1-3.5"/>', c),
  fork: (c) => svg('<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 1.5-2.5 4-2.5 7h4V3M17.5 10v11"/>', c),
  arrowRight: (c) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', c),
  chevronRight: (c) => svg('<path d="M9 6l6 6-6 6"/>', c),
  user: (c) => svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', c),
  lantern: (c) => svg('<path d="M12 2v2"/><rect x="9" y="4" width="6" height="2" rx="1"/><path d="M8 6h8c1.5 2 2 4 2 6s-.5 4-2 6H8c-1.5-2-2-4-2-6s.5-4 2-6z"/><rect x="9" y="18" width="6" height="2" rx="1"/><path d="M12 20v2"/>', c),
};

/** 코스 뽑기 로딩용 연등 7개 (가로 스크롤 넓이에 꽉 참) */
export function multiLanterns() {
  const cfg = [
    { x: 28,  d: 0,    t: 1.05, s: 0.82, f: '#E8462E' },
    { x: 78,  d: 0.22, t: 1.30, s: 0.96, f: '#F2765C' },
    { x: 128, d: 0.50, t: 1.10, s: 0.90, f: '#D83820' },
    { x: 193, d: 0.08, t: 1.40, s: 1.08, f: '#F2765C' },
    { x: 258, d: 0.35, t: 1.00, s: 0.90, f: '#E05030' },
    { x: 308, d: 0.18, t: 1.25, s: 0.96, f: '#F2765C' },
    { x: 357, d: 0.45, t: 1.15, s: 0.82, f: '#E8462E' },
  ];
  const lamp = ({ x, d, t, s, f }) => `
    <g class="lamp" style="--dur:${t}s;--delay:${d}s" transform="translate(${x} 14)">
      <g transform="scale(${s})">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#1E2A4A" stroke-width="1.5"/>
        <rect x="-8" y="8" width="16" height="4" rx="1.5" fill="#1E2A4A"/>
        <ellipse cx="0" cy="29" rx="15" ry="18" fill="${f}"/>
        <path d="M-14 22h28M-15 29h30M-14 36h28" stroke="#fff" stroke-opacity=".28" stroke-width="1.2"/>
        <rect x="-8" y="46" width="16" height="4" rx="1.5" fill="#1E2A4A"/>
        <line x1="0" y1="50" x2="0" y2="58" stroke="${f}" stroke-width="2"/>
      </g>
    </g>`;
  return `<svg viewBox="0 0 385 108" aria-hidden="true">
    <path d="M0 12 Q193 38 385 12" stroke="#1E2A4A" stroke-width="1.5" fill="none"/>
    ${cfg.map(lamp).join('')}
  </svg>`;
}

/** 상세 화면 헤더용 등불 일러스트 */
export const lanternIllustration = `
<svg class="lanterns" viewBox="0 0 120 120" aria-hidden="true">
  <path d="M0 14 Q60 34 120 14" stroke="#C9D0E4" stroke-width="1.5" fill="none"/>
  ${[[22, 19, 1], [60, 24, 1.15], [98, 19, 1]].map(([x, y, s]) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <line x1="0" y1="0" x2="0" y2="6" stroke="#C9D0E4" stroke-width="1.5"/>
    <rect x="-7" y="6" width="14" height="4" rx="1.5" fill="#1E2A4A" stroke="#C9D0E4" stroke-width="1"/>
    <ellipse cx="0" cy="24" rx="13" ry="15" fill="#F2765C"/>
    <path d="M-12 18h24M-13 24h26M-12 30h24" stroke="#1E2A4A" stroke-opacity=".25" stroke-width="1"/>
    <rect x="-7" y="38" width="14" height="4" rx="1.5" fill="#1E2A4A" stroke="#C9D0E4" stroke-width="1"/>
    <line x1="0" y1="42" x2="0" y2="50" stroke="#F2765C" stroke-width="2"/>
  </g>`).join('')}
</svg>`;

/** HTML 이스케이프 */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── 뽑기 패널 3D 오미쿠지 통 (WebGL 되면 등불 자리에 옻칠 통을 띄움. 안 되면 기존 등불 그대로) ──
let omk = null;
// 첫 화면이 다 뜨고 한가할 때까지 기다림 → 3D 배경·목록 그리기와 겹쳐 버벅이지 않게
const afterReveal = () => window.__yoriRevealed ? Promise.resolve()
  : new Promise((ok) => { addEventListener('yori:revealed', ok, { once: true }); setTimeout(ok, 4000); });
const idle = () => new Promise((ok) => (window.requestIdleCallback ? requestIdleCallback(() => ok(), { timeout: 1200 }) : setTimeout(ok, 250)));
/** 페이지마다 한 번: kind = 'food'(食) | 'fest'(祭) | 'spot'(遊) */
export async function dpMount(kind) {
  const panel = document.getElementById('draw-panel');
  const lantern = panel?.querySelector('.dp-lantern');
  if (!lantern || !window.gsap) return;
  try {
    await afterReveal();
    await idle();
    const m = await import('./omikuji/omikuji-stage.js');
    if (!m.webglOk() || !lantern.isConnected) return;
    const slot = document.createElement('span');
    slot.className = 'dp-omk';
    slot.setAttribute('role', 'presentation');
    slot.hidden = true;
    lantern.after(slot);
    const inst = m.mountOmikuji(slot, { kind, calm: RM(), onTap: () => panel.querySelector('.dp-btn')?.click() });
    await inst.ready;                       // 셰이더 준비가 끝난 뒤에 등불과 바꿔 끼움 (빈 칸·멈칫 없음)
    if (!slot.isConnected || panel.classList.contains('is-drawing')) { slot.remove(); return; }
    omk = inst;
    slot.hidden = false;
    lantern.style.display = 'none';   // CSS display:grid 때문에 hidden 속성만으론 안 숨겨짐
    inst.show();
  } catch (e) {
    console.warn('오미쿠지 3D를 켤 수 없어요', e);
  }
}

/** 뽑기 패널: 등불이 은은하게 깜빡이는 동안 task 실행 (너무 빨리 끝나면 최소 시간만큼 기다려 연출이 끊기지 않게)
 *  오미쿠지 통이 떠 있으면 통 흔들기 → 막대 뽑기 연출이 끝나는 순간 결과를 돌려줌
 *  label(result) → { title, sub }: 연출 마지막에 펼쳐지는 두루마리에 쓸 글 (선택) */
export async function dpRun(task, minMs = 800, label) {
  const panel = document.getElementById('draw-panel');
  if (omk?.alive && omk.slot && panel?.contains(omk.slot)) {
    panel.classList.remove('lit');
    panel.classList.add('is-drawing');
    try { return await omk.draw(task, { label }); }
    finally { panel.classList.remove('is-drawing'); }
  }
  panel?.classList.remove('lit');
  panel?.classList.add('is-drawing');
  try {
    const [r] = await Promise.all([task(), new Promise(ok => setTimeout(ok, RM() ? 0 : minMs))]);
    return r;
  } finally {
    panel?.classList.remove('is-drawing');
  }
}

/** 뽑기 결과에 넣은 목록 카드([data-dp-card])를 누르거나 Enter·Space → 상세 열기 */
export function bindCard(root, open) {
  const card = root.querySelector('[data-dp-card]');
  if (!card) return;
  card.addEventListener('click', (e) => { if (!e.target.closest('a, button')) open(); });
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
}

/** 뽑기 결과 넣기: 이전 높이 → 새 높이로 부드럽게 늘고, 내용은 스르륵 떠오름. lit=false면 등불 연출 없이(안내 문구) */
export function dpShow(el, html, lit = true) {
  const from = el.hidden ? 0 : el.getBoundingClientRect().height;
  el.getAnimations().forEach(a => a.cancel());
  el.innerHTML = html;
  el.hidden = false;
  const to = el.getBoundingClientRect().height;
  if (!RM()) {
    el.animate(
      [{ height: `${from}px`, opacity: from ? 1 : 0 }, { height: `${to}px`, opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' },
    ).onfinish = () => { el.style.overflow = ''; };
    el.style.overflow = 'hidden';
    el.firstElementChild?.animate(
      [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
      { duration: 480, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
    );
  }
  if (lit) dpLight();
}

/** 뽑기 패널: 결과가 나올 때 등불이 켜지는 연출 */
export function dpLight() {
  const panel = document.getElementById('draw-panel');
  if (!panel) return;
  panel.classList.add('is-drawn');
  panel.classList.remove('lit');
  void panel.offsetWidth;
  panel.classList.add('lit');
}

/** 페이지 제목용 컬러 아이콘 (주변 맛집·축제·놀거리). 글자 크기(1em)에 맞춰 그려짐 */
export const TITLE_ICONS = {
  food: `<svg class="title-svg" viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="ti-bowl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0603A"/><stop offset="1" stop-color="#B22E19"/></linearGradient></defs>
    <path d="M8.6 2.6c-.9 1.1.9 1.9 0 3.1M12 1.8c-.9 1.1.9 1.9 0 3.1" fill="none" stroke="#F5EFE6" stroke-width="1" stroke-linecap="round" opacity=".55"/>
    <path d="M14.2 1.6 20.6 9.4M16.4 1 21.8 8.2" stroke="#D9A066" stroke-width="1.15" stroke-linecap="round"/>
    <ellipse cx="12" cy="10.9" rx="8.6" ry="1.9" fill="#F7D57A"/>
    <path d="M10 10.3c1 .6 2.2.6 3.2 0s2.2-.6 3.2 0M6.6 10.6c1-.5 2-.5 3 0" fill="none" stroke="#E6AE33" stroke-width=".7" stroke-linecap="round"/>
    <path d="M3 11h18c0 4.6-3.7 8.3-8.3 8.3h-1.4C6.7 19.3 3 15.6 3 11z" fill="url(#ti-bowl)"/>
    <path d="M4.4 13.6c1.2-.9 2.4-.9 3.6 0s2.4.9 3.6 0 2.4-.9 3.6 0 2.4.9 3.6 0" fill="none" stroke="#F2C14E" stroke-width=".85" stroke-linecap="round"/>
    <rect x="8.8" y="19" width="6.4" height="1.9" rx=".7" fill="#7E2414"/>
  </svg>`,
  fest: `<svg class="title-svg" viewBox="0 0 24 24" aria-hidden="true">
    <defs><radialGradient id="ti-lan" cx=".45" cy=".42" r=".65"><stop offset="0" stop-color="#FFB27A"/><stop offset=".45" stop-color="#F05A34"/><stop offset="1" stop-color="#B22E19"/></radialGradient></defs>
    <path d="M12 .8v2.2" stroke="#F2C14E" stroke-width="1.1" stroke-linecap="round"/>
    <rect x="8.2" y="2.8" width="7.6" height="2.2" rx=".6" fill="#2A1208" stroke="#F2C14E" stroke-width=".6"/>
    <path d="M7.2 5h9.6c1.9 2 2.8 4.3 2.8 7s-.9 5-2.8 7H7.2c-1.9-2-2.8-4.3-2.8-7s.9-5 2.8-7z" fill="url(#ti-lan)"/>
    <path d="M5.5 8.2h13M4.8 11.2h14.4M4.8 13.8h14.4M5.5 16.8h13" stroke="#5A1608" stroke-width=".55" opacity=".45"/>
    <path d="M12 5.2c-1.6 2-2.3 4.3-2.3 6.8s.7 4.8 2.3 6.8" fill="none" stroke="#FFE0B8" stroke-width=".6" opacity=".55"/>
    <rect x="8.2" y="19" width="7.6" height="2.2" rx=".6" fill="#2A1208" stroke="#F2C14E" stroke-width=".6"/>
    <path d="M12 21.2v2" stroke="#F2C14E" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`,
  spot: TORII.replace('class="torii"', 'class="title-svg"'),
};
