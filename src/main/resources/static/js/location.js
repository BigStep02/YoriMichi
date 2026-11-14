// 검색 기준 위치 결정: 현재 위치(일본 안) → 아니면 테스트 도시
export const TEST_CITIES = [
  { key: 'osaka',     name: '오사카 (도쇼마치)', short: '오사카',  lat: 34.6905, lng: 135.5066 },
  { key: 'kyoto',     name: '교토역',           short: '교토',    lat: 34.9858, lng: 135.7588 },
  { key: 'nara',      name: '나라역',           short: '나라',    lat: 34.6851, lng: 135.8048 },
  { key: 'nagahama',  name: '나가하마',         short: '나가하마', lat: 35.3780, lng: 136.2650 },
  { key: 'himeji',    name: '히메지',           short: '히메지',  lat: 34.8270, lng: 134.6909 },
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
  return TEST_CITIES.find(c => c.key === key) ?? TEST_CITIES[0];
}

export function getLocationMode() {
  return read(MODE_KEY, 'geo') === 'city' ? 'city' : 'geo';
}

/** 'geo' 또는 테스트 도시 key */
export function setLocationChoice(value) {
  if (value === 'geo') {
    write(MODE_KEY, 'geo');
  } else {
    write(MODE_KEY, 'city');
    write(CITY_KEY, value);
  }
}

function inJapan(lat, lng) {
  return lat >= 24 && lat <= 46 && lng >= 122 && lng <= 146;
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

function cityLocation(reason) {
  const c = getTestCity();
  return { lat: c.lat, lng: c.lng, label: `${c.short} (테스트)`, source: 'test', reason };
}

/**
 * @returns {Promise<{lat:number, lng:number, label:string, source:'geo'|'test', reason?:string}>}
 */
export async function getSearchLocation() {
  if (getLocationMode() === 'city') return cityLocation();

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
