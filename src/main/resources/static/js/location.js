// 검색 기준 위치 결정: 현재 위치(일본 안) → 아니면 테스트 도시
export const TEST_CITIES = [
  // 홋카이도
  { key: 'sapporo',   region: '홋카이도', name: '삿포로 (오도리)',    short: '삿포로',   lat: 43.0605, lng: 141.3545 },
  { key: 'asahikawa', region: '홋카이도', name: '아사히카와',          short: '아사히카와', lat: 43.7628, lng: 142.3584 },
  // 도호쿠
  { key: 'aomori',    region: '도호쿠',   name: '아오모리역',          short: '아오모리', lat: 40.8285, lng: 140.7340 },
  { key: 'akita',     region: '도호쿠',   name: '아키타역',            short: '아키타',   lat: 39.7170, lng: 140.1290 },
  { key: 'yokote',    region: '도호쿠',   name: '요코테역',            short: '요코테',   lat: 39.3110, lng: 140.5640 },
  { key: 'sendai',    region: '도호쿠',   name: '센다이역',            short: '센다이',   lat: 38.2601, lng: 140.8822 },
  // 간토
  { key: 'tokyo',     region: '간토',     name: '도쿄 (아사쿠사)',     short: '도쿄',     lat: 35.7148, lng: 139.7967 },
  { key: 'chichibu',  region: '간토',     name: '지치부',              short: '지치부',   lat: 35.9917, lng: 139.0856 },
  { key: 'sawara',    region: '간토',     name: '사와라역',            short: '사와라',   lat: 35.8870, lng: 140.4990 },
  // 주부
  { key: 'takayama',  region: '주부',     name: '다카야마역',          short: '다카야마', lat: 36.1408, lng: 137.2522 },
  { key: 'gujo',      region: '주부',     name: '군조하치만',          short: '군조',     lat: 35.7490, lng: 136.9610 },
  { key: 'nagaoka',   region: '주부',     name: '나가오카역',          short: '나가오카', lat: 37.4470, lng: 138.8510 },
  { key: 'kanazawa',  region: '주부',     name: '가나자와역',          short: '가나자와', lat: 36.5781, lng: 136.6478 },
  { key: 'nagoya',    region: '주부',     name: '나고야 (사카에)',     short: '나고야',   lat: 35.1700, lng: 136.9080 },
  // 간사이
  { key: 'osaka',     region: '간사이',   name: '오사카 (도쇼마치)',   short: '오사카',   lat: 34.6905, lng: 135.5066 },
  { key: 'dotonbori', region: '간사이',   name: '오사카 (도톤보리)',   short: '도톤보리', lat: 34.6687, lng: 135.5013 },
  { key: 'kyoto',     region: '간사이',   name: '교토역',              short: '교토',     lat: 34.9858, lng: 135.7588 },
  { key: 'nara',      region: '간사이',   name: '나라역',              short: '나라',     lat: 34.6851, lng: 135.8048 },
  { key: 'nagahama',  region: '간사이',   name: '나가하마',            short: '나가하마', lat: 35.3780, lng: 136.2650 },
  { key: 'himeji',    region: '간사이',   name: '히메지',              short: '히메지',   lat: 34.8270, lng: 134.6909 },
  { key: 'katsuura',  region: '간사이',   name: '기이카쓰우라 (나치)', short: '나치',     lat: 33.6260, lng: 135.9420 },
  // 주고쿠·시코쿠
  { key: 'izumo',     region: '주고쿠·시코쿠', name: '이즈모시역',     short: '이즈모',   lat: 35.3610, lng: 132.7560 },
  { key: 'hiroshima', region: '주고쿠·시코쿠', name: '미야지마구치',   short: '미야지마', lat: 34.3120, lng: 132.3030 },
  { key: 'tokushima', region: '주고쿠·시코쿠', name: '도쿠시마역',     short: '도쿠시마', lat: 34.0742, lng: 134.5517 },
  { key: 'kochi',     region: '주고쿠·시코쿠', name: '고치역',         short: '고치',     lat: 33.5670, lng: 133.5430 },
  // 규슈·오키나와
  { key: 'fukuoka',   region: '규슈·오키나와', name: '후쿠오카 (하카타)', short: '후쿠오카', lat: 33.5902, lng: 130.4207 },
  { key: 'nagasaki',  region: '규슈·오키나와', name: '나가사키역',     short: '나가사키', lat: 32.7523, lng: 129.8700 },
  { key: 'naha',      region: '규슈·오키나와', name: '나하 (국제거리)', short: '나하',    lat: 26.2150, lng: 127.6860 },
];

const CITY_KEY = 'testCity';
const MODE_KEY = 'locationMode'; // 'geo' = 현재 위치 우선, 'city' = 테스트 도시 고정

function read(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}

export function getTestCity() {
  const key = read(CITY_KEY, 'osaka');
  return TEST_CITIES.find(c => c.key === key) ?? TEST_CITIES.find(c => c.key === 'osaka');
}

export function getLocationMode() {
  return read(MODE_KEY, 'geo') === 'city' ? 'city' : 'geo';
}

/** 'geo' 또는 테스트 도시 key */
export function setLocationChoice(value) {
  try { localStorage.removeItem(DEV_KEY); sessionStorage.removeItem(DEV_KEY); } catch { /* noop */ }
  if (value === 'geo') {
    write(MODE_KEY, 'geo');
  } else {
    write(MODE_KEY, 'city');
    write(CITY_KEY, value);
  }
}

// 일본 범위 판정. 단순 사각형(위도 24~46, 경도 122~146)에는 한국이 통째로 들어가서
// 한국에서 위치를 허용하면 서울·부산을 "일본 안"으로 착각했음 → 한반도·제주·연해주를 뺌
function inJapan(lat, lng) {
  if (lat < 24 || lat > 46 || lng < 122 || lng > 146) return false;
  if (lat >= 33.9 && lng < 129.6 && !(lat <= 34.75 && lng >= 129.15)) return false; // 한반도 (쓰시마는 일본)
  if (lat >= 33.0 && lat < 33.7 && lng < 127.2) return false;                        // 제주
  if (lat >= 37.4 && lat <= 37.6 && lng >= 130.7 && lng <= 131.0) return false;      // 울릉도
  if (lat > 41.3 && lng < 139.3) return false;                                        // 연해주·중국 동북부
  return true;
}

function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 8000,
      maximumAge: 10 * 60 * 1000,
      enableHighAccuracy: false,
    });
  });
}

// 시연용 위치 고정 (발표·테스트용)
//  ?devLat=34.6687&devLng=135.5013 → 이 브라우저에서 계속 그 좌표를 "현재 위치 (시연)"으로 사용 (GPS 권한을 묻지 않음)
//  ?city=dotonbori                → 테스트 도시 고정 모드로 전환 (TEST_CITIES의 key)
//  ?devLat=off                    → 시연 위치 해제
const DEV_KEY = 'devLocation';
function applyUrlOverrides() {
  try {
    const p = new URLSearchParams(location.search);
    if (p.get('devLat') === 'off') {
      localStorage.removeItem(DEV_KEY);
      sessionStorage.removeItem(DEV_KEY);
    }
    const lat = Number(p.get('devLat'));
    const lng = Number(p.get('devLng'));
    if (p.has('devLat') && p.has('devLng') && inJapan(lat, lng)) {
      localStorage.setItem(DEV_KEY, JSON.stringify({ lat, lng }));
      localStorage.setItem(MODE_KEY, 'geo');
    }
    const city = p.get('city');
    if (city && TEST_CITIES.some(c => c.key === city)) {
      localStorage.removeItem(DEV_KEY);
      localStorage.setItem(MODE_KEY, 'city');
      localStorage.setItem(CITY_KEY, city);
    }
  } catch { /* 저장소를 못 쓰는 환경이면 무시 */ }
}
applyUrlOverrides();

function devLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEV_KEY) || sessionStorage.getItem(DEV_KEY) || 'null');
    return saved && inJapan(saved.lat, saved.lng) ? saved : null;
  } catch { return null; }
}

function cityLocation(reason) {
  const c = getTestCity();
  return { lat: c.lat, lng: c.lng, label: `${c.short} (테스트)`, source: 'test', reason };
}

/**
 * @returns {Promise<{lat:number, lng:number, label:string, source:'geo'|'test', reason?:string}>}
 */
export async function getSearchLocation() {
  if (getLocationMode() === 'city') return cityLocation();

  const dev = devLocation();
  if (dev) return { ...dev, label: '현재 위치 (시연)', source: 'geo' };

  if (!window.isSecureContext) {
    return cityLocation('HTTPS가 아니라 현재 위치를 쓸 수 없어요');
  }
  try {
    const pos = await currentPosition();
    const { latitude: lat, longitude: lng } = pos.coords;
    if (inJapan(lat, lng)) {
      return { lat, lng, label: '현재 위치', source: 'geo' };
    }
    return cityLocation('현재 위치가 일본 밖이라 테스트 도시로 찾아요');
  } catch (e) {
    const denied = e && e.code === 1;
    return cityLocation(denied ? '위치 권한이 없어 테스트 도시로 찾아요' : '현재 위치를 못 가져와 테스트 도시로 찾아요');
  }
}
