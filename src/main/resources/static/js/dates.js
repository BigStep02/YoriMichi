// 날짜 유틸 — 모든 날짜는 'yyyy-MM-dd' 문자열, 기준 시간대 Asia/Tokyo
const TOKYO = 'Asia/Tokyo';

/** Asia/Tokyo 기준 오늘 (yyyy-MM-dd) */
export function todayTokyo() {
  // en-CA 로케일은 yyyy-MM-dd 형식으로 출력됨
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TOKYO, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function parse(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function format(date) {
  return date.toISOString().slice(0, 10);
}

/** addDays('2026-11-30', 1) → '2026-12-01' */
export function addDays(ymd, n) {
  const d = parse(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return format(d);
}

export function isValidYmd(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && format(parse(s)) === s;
}

/** '2026-11-22' → '11.22' (올해가 아니면 '2027.04.13') */
export function formatDate(ymd) {
  const [y, m, d] = ymd.split('-');
  const md = `${m}.${d}`;
  return y === todayTokyo().slice(0, 4) ? md : `${y}.${md}`;
}

/** formatRange('2026-11-22', '2026-11-23') → '11.22 – 11.23' */
export function formatRange(from, to) {
  if (!to || from === to) return formatDate(from);
  const [fy] = from.split('-');
  const [ty, tm, td] = to.split('-');
  const right = fy === ty ? `${tm}.${td}` : formatDate(to);
  return `${formatDate(from)} – ${right}`;
}

/** 서버의 dDay/ongoing → 배지 문구 */
export function dDayLabel(dDay, ongoing) {
  if (ongoing) return '진행 중';
  if (dDay > 0) return `D-${dDay}`;
  if (dDay === 0) return 'D-DAY';
  return '종료';
}
