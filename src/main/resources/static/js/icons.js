// 인라인 SVG 아이콘 (currentColor 사용)
const svg = (body, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
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
